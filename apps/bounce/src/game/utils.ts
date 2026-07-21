import { stateBet } from 'state-shared';
import { createPlayBookUtils } from 'utils-book';

import { eventEmitter } from './eventEmitter';
import type { Bet, BookEvent, BookEventOfType } from './typesBookEvent';
import { bookEventHandlerMap } from './bookEventHandlerMap';

export const { playBookEvent, playBookEvents } = createPlayBookUtils({ bookEventHandlerMap });

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
	stateBet.winBookEventAmount = 0;
	const bookEvents = bet.state;
	const context = { bookEvents };
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
