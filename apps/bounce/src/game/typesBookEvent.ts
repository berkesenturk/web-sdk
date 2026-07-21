import type { BetType } from 'rgs-requests';

import type { Tile, Vec2, ModeName } from './types';

// Field-for-field mirror of BOOK_CONTRACT.md and the math-sdk emitters
// (games/bounce/game_events.py). Amounts on setTotalWin/finalWin are integer
// CENTS (bet-multiple x 100); every other numeric quantity is game-native POINTS.

// Board setup, always index 0.
type BookEventReveal = {
	index: number;
	type: 'reveal';
	mode: ModeName;
	maxDvds: number;
	tiles: Tile[];
	discStart: { x: number; y: number; direction: number };
};

// One wall contact: the authoritative contact point + struck tile + fate flags.
// Geometry guarantee: consecutive contacts of one DVD are joined by lawful
// mirror reflections, so straight lines between positions are the true path.
type BookEventBounce = {
	index: number;
	type: 'bounce';
	dvdIndex: number;
	round: number;
	bounceIndex: number;
	position: Vec2;
	tileIndex: number;
	tileKind: Tile['kind'];
	value: number;
	mineImmune: boolean;
	lethal: boolean;
	splitSuppressed: boolean;
	zoneSum: number;
	runningTotal: number;
};

// Mythosis: the parent DVD (whose bounce on the mythosis tile immediately
// precedes this) is destroyed; two children spawn at the contact point.
type BookEventSplit = {
	index: number;
	type: 'split';
	parentDvdIndex: number;
	round: number;
	tileIndex: number;
	position: Vec2;
	childDvdIndexes: number[];
	remainingBounces: number;
};

// Corner strike: the preceding same-DVD bounce's reflected ray terminates
// exactly at `position` ({x: 0|1, y: 0|1}) — the disc really travels there.
type BookEventCorner = {
	index: number;
	type: 'corner';
	dvdIndex: number;
	round: number;
	tileIndex: number;
	position: { x: number; y: number };
	cornerMultiplier: number;
	cornerProduct: number;
	zoneSum: number;
	runningTotal: number;
};

// Extra round for the corner-striking DVD on the same running total.
type BookEventChain = {
	index: number;
	type: 'chain';
	dvdIndex: number;
	fromRound: number;
	toRound: number;
};

// Resolved win (cents), once after all DVDs finish.
type BookEventSetTotalWin = {
	index: number;
	type: 'setTotalWin';
	amount: number;
};

// Final payout (cents), last event; equals the book's payoutMultiplier.
type BookEventFinalWin = {
	index: number;
	type: 'finalWin';
	amount: number;
};

// Customised, client-only: a synthetic event used to reconstruct state on resume
// (replay the reserved reveal/setTotalWin without animation). Never emitted by
// the math-sdk.
type BookEventCreateBonusSnapshot = {
	index: number;
	type: 'createBonusSnapshot';
	bookEvents: BookEvent[];
};

export type BookEvent =
	| BookEventReveal
	| BookEventBounce
	| BookEventSplit
	| BookEventCorner
	| BookEventChain
	| BookEventSetTotalWin
	| BookEventFinalWin
	// customised
	| BookEventCreateBonusSnapshot;

export type Bet = BetType<BookEvent>;
export type BookEventOfType<T> = Extract<BookEvent, { type: T }>;
export type BookEventContext = { bookEvents: BookEvent[] };
