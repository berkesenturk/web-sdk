import type { BookEvent } from '../game/typesBookEvent';
import { playBookEvent } from '../game/utils';

type Match = (bookEvent: BookEvent) => boolean;

// Bounce book events are stateful: `bounce`/`corner`/`split` need the board and
// the disc spawn position that `reveal` installs, so playing one in isolation
// would render nothing. Each event story therefore replays its own book's
// reveal first, then the matched event(s) in book order. Pass more than one
// matcher where an event only reads correctly with its lead-in (finalWin, for
// instance, shows the payout that setTotalWin put on the meter).
export const playEventsFrom = async (books: { events: unknown[] }[], ...matchers: Match[]) => {
	const book = books.find((candidate) =>
		matchers.every((match) => (candidate.events as BookEvent[]).some(match)),
	);
	if (!book) {
		console.warn('No book in this fixture contains all the requested events');
		return;
	}
	const bookEvents = book.events as BookEvent[];
	const context = { bookEvents };
	const [reveal] = bookEvents;
	await playBookEvent(reveal, context);
	for (const match of matchers) {
		const target = bookEvents.find(match);
		if (target && target !== reveal) await playBookEvent(target, context);
	}
};
