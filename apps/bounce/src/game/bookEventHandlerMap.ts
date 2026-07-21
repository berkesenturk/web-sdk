import _ from 'lodash';

import { type BookEventHandlerMap } from 'utils-book';
import { stateBet } from 'state-shared';

import { eventEmitter } from './eventEmitter';
import { playBookEvent } from './utils';
import { stateGame, stateGameDerived } from './stateGame.svelte';
import type { BookEvent, BookEventOfType, BookEventContext } from './typesBookEvent';

// One async handler per book-event type. Handlers contain NO Pixi: they update
// reactive state and broadcast render commands (emitter events); the components
// own the actual animation. `await broadcastAsync(...)` paces playback to the
// animation it triggers.
//
// Multi-DVD rounds run cycle-parallel (utils.playBet): handlers of different
// DVDs in one round-robin cycle run CONCURRENTLY, so runningTotal only ever
// ratchets upward (per-event values within a cycle may arrive out of order).
const advanceRunningTotal = (runningTotal: number) => {
	if (runningTotal > stateGame.runningTotal) stateGame.runningTotal = runningTotal;
};

export const bookEventHandlerMap: BookEventHandlerMap<BookEvent, BookEventContext> = {
	reveal: async (bookEvent: BookEventOfType<'reveal'>) => {
		stateGameDerived.settle(bookEvent);
		// Note: stateGame.skip is cleared at bet start (stateGameDerived.reset in
		// actor.onNewGameStart), NOT here — clearing it once the animation begins
		// would wipe a skip the player pressed during the pre-animation delay.
		await eventEmitter.broadcastAsync({ type: 'boardReset' });
	},
	bounce: async (bookEvent: BookEventOfType<'bounce'>) => {
		// Travel first: the impact FX (tile flash, pop, HUD tick) fire only once
		// the disc has actually reached the contact point.
		await eventEmitter.broadcastAsync({
			type: 'discMove',
			dvdIndex: bookEvent.dvdIndex,
			position: bookEvent.position,
		});
		advanceRunningTotal(bookEvent.runningTotal);
		await eventEmitter.broadcastAsync({
			type: 'discBounce',
			dvdIndex: bookEvent.dvdIndex,
			position: bookEvent.position,
			tileIndex: bookEvent.tileIndex,
			tileKind: bookEvent.tileKind,
			value: bookEvent.value,
			mineImmune: bookEvent.mineImmune,
			lethal: bookEvent.lethal,
			splitSuppressed: bookEvent.splitSuppressed,
			runningTotal: bookEvent.runningTotal,
		});
		// A post-immunity mine destroys the DVD: unmount its disc (the explosion
		// FX spawned by discBounce plays on independently in HitFx).
		if (bookEvent.lethal) {
			stateGame.discs = stateGame.discs.filter((d) => d.dvdIndex !== bookEvent.dvdIndex);
		}
	},
	split: async (bookEvent: BookEventOfType<'split'>) => {
		// Mount the children at the split point before the FX so they're visible
		// as the pop plays; the parent disc unmounts in the same update.
		stateGame.discs = [
			...stateGame.discs.filter((d) => d.dvdIndex !== bookEvent.parentDvdIndex),
			...bookEvent.childDvdIndexes.map((dvdIndex) => ({
				dvdIndex,
				spawn: bookEvent.position,
			})),
		];
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
		await eventEmitter.broadcastAsync({
			type: 'discMove',
			dvdIndex: bookEvent.dvdIndex,
			position: bookEvent.position,
		});
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
