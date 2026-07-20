import type config from './config';

// The four bet modes (= reveal.mode), keyed off the config object so the union
// can never drift from the declared modes.
export type BetMode = keyof typeof config.betModes;
export type ModeName = BetMode;

// Bounce has no free game; a single game type keeps parity with the framework's
// stateGame.gameType expectation without introducing slots-style mode switching.
export type GameType = 'basegame';

export type Wall = 'top' | 'bottom' | 'left' | 'right';
export type DvdMode = 'independent' | 'sequential';

// Cosmetic mode from the wall-sign selector (ModeSelector). Purely visual:
// gameplay always plays the booked `normal` mode regardless of this value.
export type VisualMode = 'normal' | 'corner_rush' | 'mythosis' | 'mythosis_plus';

// Board-normalized (0..1) coordinate, as stored in the book.
export type Vec2 = { x: number; y: number };

// One of the 40 wall zones drawn by the `reveal` event.
export type Zone = {
	zoneIndex: number;
	wall: Wall;
	start: number;
	end: number;
	value: number;
	isGlow: boolean;
	isDead: boolean;
};
