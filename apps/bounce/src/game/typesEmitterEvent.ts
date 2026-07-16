import type { Vec2 } from './types';

// Render commands broadcast by the book-event handlers (bookEventHandlerMap) and
// consumed by the Pixi components. Handlers contain NO Pixi — they only translate
// book events into these emitter events. Components own the animation.
//
// Kept as one central union (rather than the slots template's per-component
// exports) because bounce has a small, fixed render surface.
export type EmitterEventGame =
	// clear the board / discs for a fresh spin
	| { type: 'boardReset' }
	// disc travel to the booked contact point. Awaited BEFORE discBounce so the
	// impact FX only fire once the disc has arrived.
	| { type: 'discMove'; dvdIndex: number; position: Vec2 }
	// one wall impact at the contact point: flash the struck zone, spawn the pop,
	// buzz the grille, advance the points HUD. Broadcast after discMove completes.
	| {
			type: 'discBounce';
			dvdIndex: number;
			position: Vec2;
			zoneIndex: number;
			zoneValue: number;
			isGlow: boolean;
			isDead: boolean;
			isExtra: boolean;
			runningTotal: number;
	  }
	// end-of-round corner: play the multiplier FX and jump the points HUD.
	| {
			type: 'discCorner';
			dvdIndex: number;
			cornerMultiplier: number;
			glowBoost: number;
			effectiveMultiplier: number;
			runningTotal: number;
	  }
	// extra round on the same running total.
	| { type: 'discChain'; dvdIndex: number; fromRound: number; toRound: number }
	// the book is resolved (finalWin): stop round-long FX like the VU needle loop.
	| { type: 'roundEnd' };
