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
export const bookEventHandlerMap: BookEventHandlerMap<BookEvent, BookEventContext> = {
	reveal: async (bookEvent: BookEventOfType<'reveal'>) => {
		stateGameDerived.settle(bookEvent);
		// Note: stateGame.skip is cleared at bet start (stateGameDerived.reset in
		// actor.onNewGameStart), NOT here — clearing it once the animation begins
		// would wipe a skip the player pressed during the pre-animation delay.
		// Awaited so the tiles' reveal wave (paced by Board) finishes before the
		// first bounce launches.
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
		stateGame.runningTotal = bookEvent.runningTotal;
		await eventEmitter.broadcastAsync({
			type: 'discBounce',
			dvdIndex: bookEvent.dvdIndex,
			position: bookEvent.position,
			zoneIndex: bookEvent.zoneIndex,
			zoneValue: bookEvent.zoneValue,
			isGlow: bookEvent.isGlow,
			isDead: bookEvent.isDead,
			isExtra: bookEvent.isExtra,
			runningTotal: bookEvent.runningTotal,
		});
	},
	corner: async (bookEvent: BookEventOfType<'corner'>) => {
		stateGame.runningTotal = bookEvent.runningTotal;
		await eventEmitter.broadcastAsync({
			type: 'discCorner',
			dvdIndex: bookEvent.dvdIndex,
			cornerMultiplier: bookEvent.cornerMultiplier,
			glowBoost: bookEvent.glowBoost,
			effectiveMultiplier: bookEvent.effectiveMultiplier,
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
