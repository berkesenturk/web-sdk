import type { Vec2, TileKind } from './types';

// Render commands broadcast by the book-event handlers (bookEventHandlerMap) and
// consumed by the Pixi components. Handlers contain NO Pixi — they only translate
// book events into these emitter events. Components own the animation.
//
// Multi-DVD rounds play cycle-parallel (see utils.playBet): events of different
// DVDs within one round-robin cycle broadcast CONCURRENTLY, so every consumer
// filters by dvdIndex where it matters.
export type EmitterEventGame =
	// clear the board / discs for a fresh spin
	| { type: 'boardReset' }
	// disc travel to the booked contact point (a wall contact or, before a
	// discCorner, the exact corner). Awaited BEFORE the impact event so the FX
	// only fire once the disc has arrived.
	| { type: 'discMove'; dvdIndex: number; position: Vec2 }
	// one wall impact at the contact point: flash the struck tile, spawn the pop,
	// advance the points HUD. Broadcast after discMove completes.
	| {
			type: 'discBounce';
			dvdIndex: number;
			position: Vec2;
			tileIndex: number;
			tileKind: TileKind;
			value: number;
			mineImmune: boolean;
			lethal: boolean;
			splitSuppressed: boolean;
			runningTotal: number;
	  }
	// mythosis: the parent DVD is destroyed and two children spawn at the contact
	// point (their discs are mounted by the split handler before this fires).
	| {
			type: 'discSplit';
			parentDvdIndex: number;
			position: Vec2;
			childDvdIndexes: number[];
			remainingBounces: number;
	  }
	// corner strike at the booked corner (coords exactly 0/1): play the
	// multiplier FX and jump the points HUD. The disc has already travelled
	// INTO the corner via the preceding discMove.
	| {
			type: 'discCorner';
			dvdIndex: number;
			position: Vec2;
			tileIndex: number;
			cornerMultiplier: number;
			cornerProduct: number;
			runningTotal: number;
	  }
	// extra round for the corner-striking DVD on the same running total.
	| { type: 'discChain'; dvdIndex: number; fromRound: number; toRound: number }
	// the book is resolved (finalWin): stop round-long FX like the VU needle loop.
	| { type: 'roundEnd' };
