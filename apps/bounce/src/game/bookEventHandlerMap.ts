import _ from 'lodash';
import { tick } from 'svelte';

import { type BookEventHandlerMap } from 'utils-book';
import { stateBet } from 'state-shared';
import { waitForTimeout } from 'utils-shared/wait';

import { eventEmitter } from './eventEmitter';
import { playBookEvent } from './utils';
import { travelDuration } from './boardGeometry';
import { stateGame, stateGameDerived } from './stateGame.svelte';
import type { Vec2 } from './types';
import type { BookEvent, BookEventOfType, BookEventContext } from './typesBookEvent';

// One async handler per book-event type. Handlers contain NO Pixi: they update
// reactive state and broadcast render commands (emitter events); the components
// own the actual animation.
//
// PACING IS HANDLER-OWNED: for disc travel the handler computes the duration
// (constant DVD speed over the booked distance), broadcasts discMove with it,
// and waits it out itself. Components animate with the same duration but are
// never awaited — scoring can therefore never outrun the motion, even if a
// component misses an event. Multi-DVD rounds run one independent pipeline per
// DVD (utils.playBet), so runningTotal only ever ratchets upward.
const advanceRunningTotal = (runningTotal: number) => {
	if (runningTotal > stateGame.runningTotal) stateGame.runningTotal = runningTotal;
};

// Last booked position per DVD this round: spawn (reveal), split point
// (split), then every contact — the travel-time base for the next move.
const discPositions = new Map<number, Vec2>();

// Wait `ms`, but resolve immediately when a mid-round SPIN skips. ONE timer
// raced against the skip signal — never a chain of short timeouts (browsers
// throttle chained timers to ~1s each in occluded pages, which froze rounds).
const skippableWait = (ms: number) =>
	Promise.race([waitForTimeout(ms), stateGameDerived.untilSkip()]);

// Broadcast the move and pace on it: constant DVD speed, turbo and the dev
// speed slider scale it, skip (or an unknown start) makes it instant.
const moveDisc = async (dvdIndex: number, to: Vec2) => {
	const from = discPositions.get(dvdIndex);
	const factor = (stateBet.isTurbo ? 0.35 : 1) / stateGame.devSpeed;
	const duration = !from || stateGame.skip ? 0 : travelDuration(from, to) * factor;
	eventEmitter.broadcast({ type: 'discMove', dvdIndex, position: to, duration });
	discPositions.set(dvdIndex, to);
	if (duration > 0) await skippableWait(duration);
};

export const bookEventHandlerMap: BookEventHandlerMap<BookEvent, BookEventContext> = {
	reveal: async (bookEvent: BookEventOfType<'reveal'>) => {
		stateGameDerived.settle(bookEvent);
		discPositions.clear();
		discPositions.set(0, bookEvent.discStart);
		// Note: stateGame.skip is cleared at bet start (stateGameDerived.reset in
		// actor.onNewGameStart), NOT here — clearing it once the animation begins
		// would wipe a skip the player pressed during the pre-animation delay.
		// Flush the tile/disc remounts before broadcasting so every subscriber
		// of the fresh board actually receives boardReset.
		await tick();
		await eventEmitter.broadcastAsync({ type: 'boardReset' });
	},
	bounce: async (bookEvent: BookEventOfType<'bounce'>) => {
		// Travel first (handler-paced): the impact FX (tile flash, pop, HUD tick)
		// fire only once the disc has reached the contact point.
		await moveDisc(bookEvent.dvdIndex, bookEvent.position);
		advanceRunningTotal(bookEvent.runningTotal);
		await eventEmitter.broadcastAsync({
			type: 'discBounce',
			dvdIndex: bookEvent.dvdIndex,
			position: bookEvent.position,
			tileIndex: bookEvent.tileIndex,
			tileKind: bookEvent.tileKind,
			value: bookEvent.value,
			lethal: bookEvent.lethal,
			splitSuppressed: bookEvent.splitSuppressed,
			runningTotal: bookEvent.runningTotal,
		});
		// A mine destroys the DVD: unmount its disc (the explosion FX spawned by
		// discBounce plays on independently in HitFx).
		if (bookEvent.lethal) {
			stateGame.discs = stateGame.discs.filter((d) => d.dvdIndex !== bookEvent.dvdIndex);
		}
	},
	split: async (bookEvent: BookEventOfType<'split'>) => {
		// Mount the children at the split point before the FX so they're visible
		// as the pop plays; the parent disc unmounts in the same update. The
		// tick() flush lets the children's components mount and subscribe before
		// any of their events broadcast.
		discPositions.delete(bookEvent.parentDvdIndex);
		for (const child of bookEvent.childDvdIndexes) {
			discPositions.set(child, bookEvent.position);
		}
		stateGame.discs = [
			...stateGame.discs.filter((d) => d.dvdIndex !== bookEvent.parentDvdIndex),
			...bookEvent.childDvdIndexes.map((dvdIndex) => ({
				dvdIndex,
				spawn: bookEvent.position,
			})),
		];
		await tick();
		await eventEmitter.broadcastAsync({
			type: 'discSplit',
			parentDvdIndex: bookEvent.parentDvdIndex,
			position: bookEvent.position,
			childDvdIndexes: bookEvent.childDvdIndexes,
			remainingBounces: bookEvent.remainingBounces,
		});
	},
	corner: async (bookEvent: BookEventOfType<'corner'>) => {
		// The books guarantee the disc's reflected path terminates exactly on the
		// booked corner (BOOK_CONTRACT geometry guarantees), so the disc really
		// travels INTO the corner before the multiplier FX fire there.
		await moveDisc(bookEvent.dvdIndex, bookEvent.position);
		advanceRunningTotal(bookEvent.runningTotal);
		await eventEmitter.broadcastAsync({
			type: 'discCorner',
			dvdIndex: bookEvent.dvdIndex,
			position: bookEvent.position,
			tileIndex: bookEvent.tileIndex,
			cornerMultiplier: bookEvent.cornerMultiplier,
			cornerProduct: bookEvent.cornerProduct,
			runningTotal: bookEvent.runningTotal,
		});
	},
	chain: async (bookEvent: BookEventOfType<'chain'>) => {
		await eventEmitter.broadcastAsync({
			type: 'discChain',
			dvdIndex: bookEvent.dvdIndex,
			fromRound: bookEvent.fromRound,
			toRound: bookEvent.toRound,
		});
	},
	setTotalWin: async (bookEvent: BookEventOfType<'setTotalWin'>) => {
		stateBet.winBookEventAmount = bookEvent.amount;
	},
	finalWin: async (_bookEvent: BookEventOfType<'finalWin'>) => {
		// The final payout already equals the last setTotalWin; just signal the
		// round-long FX (TV VU needle loop) to wind down.
		eventEmitter.broadcast({ type: 'roundEnd' });
	},
	// customised, client-only: reconstruct state on resume without animation by
	// replaying the reserved reveal/setTotalWin events.
	createBonusSnapshot: async (
		bookEvent: BookEventOfType<'createBonusSnapshot'>,
		{ bookEvents }: BookEventContext,
	) => {
		const lastRevealEvent = _.findLast(
			bookEvent.bookEvents,
			(reserved) => reserved.type === 'reveal',
		) as BookEventOfType<'reveal'> | undefined;
		const lastSetTotalWinEvent = _.findLast(
			bookEvent.bookEvents,
			(reserved) => reserved.type === 'setTotalWin',
		) as BookEventOfType<'setTotalWin'> | undefined;

		if (lastRevealEvent) stateGameDerived.settle(lastRevealEvent);
		if (lastSetTotalWinEvent) playBookEvent(lastSetTotalWinEvent, { bookEvents });
	},
};
