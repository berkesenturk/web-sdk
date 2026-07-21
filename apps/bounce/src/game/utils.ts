import { stateBet } from 'state-shared';
import { createPlayBookUtils } from 'utils-book';

import { eventEmitter } from './eventEmitter';
import { stateGame } from './stateGame.svelte';
import type { Bet, BookEvent, BookEventOfType } from './typesBookEvent';
import { bookEventHandlerMap } from './bookEventHandlerMap';

export const { playBookEvent, playBookEvents } = createPlayBookUtils({ bookEventHandlerMap });

// Last played bet, kept for the dev-only replay button (DevBar).
export let lastPlayedBet: Bet | undefined;

// Which DVD a disc-level event belongs to (its "turn" owner); null for the
// round-level events (reveal / setTotalWin / finalWin / snapshot).
const turnDvd = (bookEvent: BookEvent): number | null => {
	switch (bookEvent.type) {
		case 'bounce':
		case 'corner':
		case 'chain':
			return bookEvent.dvdIndex;
		case 'split':
			return bookEvent.parentDvdIndex;
		default:
			return null;
	}
};

// The book interleaves concurrent DVDs in round-robin cycles: each cycle every
// active DVD takes ONE turn — a bounce (+ its split) or a corner (+ its chain).
// Play each cycle's turns CONCURRENTLY (the DVDs fly simultaneously, like the
// rules describe) and barrier between cycles so the fleet stays in step; events
// within one turn stay sequential. Single-DVD rounds degenerate to the plain
// serial playback this replaces.
export const playBet = async (bet: Bet) => {
	lastPlayedBet = bet;
	stateBet.winBookEventAmount = 0;
	const bookEvents = bet.state;
	const context = { bookEvents };
	// A DVD's disc leaves the board the moment its LAST event has played —
	// otherwise a finished DVD (e.g. after an unchained corner) sits frozen at
	// its final contact while the other DVDs keep flying.
	const lastEventIndex = new Map<number, number>();
	for (const [index, bookEvent] of bookEvents.entries()) {
		const dvd = turnDvd(bookEvent);
		if (dvd !== null) lastEventIndex.set(dvd, index);
	}
	const retireFinishedDvd = (group: BookEvent[]) => {
		const last = group[group.length - 1];
		const dvd = turnDvd(last);
		if (dvd === null || lastEventIndex.get(dvd) !== last.index) return;
		stateGame.discs = stateGame.discs.filter((d) => d.dvdIndex !== dvd);
	};
	let i = 0;
	while (i < bookEvents.length) {
		if (turnDvd(bookEvents[i]) === null) {
			await playBookEvent(bookEvents[i], context);
			i += 1;
			continue;
		}
		// Collect one cycle: per-DVD turn groups until a DVD would act twice.
		const turns = new Map<number, BookEvent[]>();
		while (i < bookEvents.length) {
			const bookEvent = bookEvents[i];
			const dvd = turnDvd(bookEvent);
			if (dvd === null) break;
			const group = turns.get(dvd);
			if (!group) {
				turns.set(dvd, [bookEvent]);
			} else {
				const last = group[group.length - 1];
				const sameTurn =
					(last.type === 'bounce' && bookEvent.type === 'split') ||
					(last.type === 'corner' && bookEvent.type === 'chain');
				if (!sameTurn) break; // this DVD acts again → next cycle
				group.push(bookEvent);
			}
			i += 1;
		}
		await Promise.all(
			[...turns.values()].map(async (group) => {
				for (const bookEvent of group) await playBookEvent(bookEvent, context);
				retireFinishedDvd(group);
			}),
		);
	}
	eventEmitter.broadcast({ type: 'stopButtonEnable' });
};

// resume bet — bounce books carry a single reveal, so reconstruction only needs
// the board (reveal) and the last displayed win (setTotalWin).
const BOOK_EVENT_TYPES_TO_RESERVE_FOR_SNAPSHOT = ['reveal', 'setTotalWin'];

export const convertTorResumableBet = (betToResume: Bet) => {
	const resumingIndex = Number(betToResume.event);
	const bookEventsBeforeResume = betToResume.state.filter(
		(_bookEvent, eventIndex) => eventIndex < resumingIndex,
	);
	const bookEventsAfterResume = betToResume.state.filter(
		(_bookEvent, eventIndex) => eventIndex >= resumingIndex,
	);

	const bookEventToCreateSnapshot: BookEventOfType<'createBonusSnapshot'> = {
		index: 0,
		type: 'createBonusSnapshot',
		bookEvents: bookEventsBeforeResume.filter((bookEvent) =>
			BOOK_EVENT_TYPES_TO_RESERVE_FOR_SNAPSHOT.includes(bookEvent.type),
		),
	};

	const stateToResume = [bookEventToCreateSnapshot, ...bookEventsAfterResume];

	return { ...betToResume, state: stateToResume };
};
