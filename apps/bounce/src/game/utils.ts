import { stateBet } from 'state-shared';
import { createPlayBookUtils } from 'utils-book';

import { eventEmitter } from './eventEmitter';
import { stateGame } from './stateGame.svelte';
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

// Multi-DVD playback: one independent pipeline per DVD. Each DVD plays its own
// event sequence at its own pace (travel timing is handler-owned, constant DVD
// speed), all pipelines run concurrently — DVDs flow naturally instead of
// waiting on each other. Split children's pipelines are gated on their
// parent's `split` event (which mounts their discs), and a DVD's disc is
// removed the moment its last event has played so finished DVDs never sit
// frozen while others fly. Round-level events (reveal / setTotalWin /
// finalWin) are barriers: all pipelines drain first.
export const playBet = async (bet: Bet) => {
	stateGame.lastBet = bet;
	stateGame.betPlaying = true;
	try {
		await playBetInner(bet);
	} finally {
		stateGame.betPlaying = false;
	}
};

const playBetInner = async (bet: Bet) => {
	stateBet.winBookEventAmount = 0;
	const bookEvents = bet.state;
	const context = { bookEvents };

	// Per-DVD event queues in stream order.
	const queues = new Map<number, BookEvent[]>();
	for (const bookEvent of bookEvents) {
		const dvd = turnDvd(bookEvent);
		if (dvd === null) continue;
		const queue = queues.get(dvd);
		if (queue) queue.push(bookEvent);
		else queues.set(dvd, [bookEvent]);
	}

	// Children may only start after their parent's split event has played
	// (that's when their discs mount at the split point).
	const gateResolvers = new Map<number, () => void>();
	const gates = new Map<number, Promise<void>>();
	for (const bookEvent of bookEvents) {
		if (bookEvent.type !== 'split') continue;
		for (const child of bookEvent.childDvdIndexes) {
			gates.set(child, new Promise<void>((resolve) => gateResolvers.set(child, resolve)));
		}
	}

	const runDvd = async (dvd: number) => {
		await gates.get(dvd);
		for (const bookEvent of queues.get(dvd) ?? []) {
			await playBookEvent(bookEvent, context);
			if (bookEvent.type === 'split') {
				for (const child of bookEvent.childDvdIndexes) gateResolvers.get(child)?.();
			}
		}
		// Out of events: this DVD is finished (completed, split, or died) —
		// its disc leaves the board.
		stateGame.discs = stateGame.discs.filter((d) => d.dvdIndex !== dvd);
	};

	const pipelines: Promise<void>[] = [];
	const started = new Set<number>();
	for (const bookEvent of bookEvents) {
		const dvd = turnDvd(bookEvent);
		if (dvd === null) {
			await Promise.all(pipelines); // barrier before round-level events
			await playBookEvent(bookEvent, context);
		} else if (!started.has(dvd)) {
			started.add(dvd);
			pipelines.push(runDvd(dvd));
		}
	}
	await Promise.all(pipelines);
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
