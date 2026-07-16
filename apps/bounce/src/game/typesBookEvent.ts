import type { BetType } from 'rgs-requests';

import type { Zone, Vec2, ModeName, DvdMode } from './types';

// Field-for-field mirror of BOOK_CONTRACT.md and the math-sdk emitters
// (games/bounce/game_events.py). Amounts on setTotalWin/finalWin are integer
// CENTS (bet-multiple x 100); every other numeric quantity is game-native POINTS.

// Board setup, always index 0.
type BookEventReveal = {
	index: number;
	type: 'reveal';
	mode: ModeName;
	dvdCount: number;
	dvdMode: DvdMode;
	zones: Zone[];
	discStart?: { x: number; y: number; direction: number };
};

// One wall hit: the authoritative contact point + struck zone + points so far.
type BookEventBounce = {
	index: number;
	type: 'bounce';
	dvdIndex: number;
	round: number;
	bounceIndex: number;
	position: Vec2;
	zoneIndex: number;
	zoneValue: number;
	isGlow: boolean;
	isDead: boolean;
	isExtra: boolean;
	runningTotal: number;
};

// End-of-round corner hit: multiplies the running point total (boosted by glow).
type BookEventCorner = {
	index: number;
	type: 'corner';
	dvdIndex: number;
	round: number;
	cornerMultiplier: number;
	glowBoost: number;
	effectiveMultiplier: number;
	runningTotal: number;
};

// Extra round on the same running total.
type BookEventChain = {
	index: number;
	type: 'chain';
	dvdIndex: number;
	fromRound: number;
	toRound: number;
};

// Running displayed win (cents).
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
	| BookEventCorner
	| BookEventChain
	| BookEventSetTotalWin
	| BookEventFinalWin
	// customised
	| BookEventCreateBonusSnapshot;

export type Bet = BetType<BookEvent>;
export type BookEventOfType<T> = Extract<BookEvent, { type: T }>;
export type BookEventContext = { bookEvents: BookEvent[] };
