import type config from './config';

// The four bet modes (= reveal.mode), keyed off the config object so the union
// can never drift from the declared modes.
export type BetMode = keyof typeof config.betModes;
export type ModeName = BetMode;

// Bounce has no free game; a single game type keeps parity with the framework's
// stateGame.gameType expectation without introducing slots-style mode switching.
export type GameType = 'basegame';

export type Wall = 'top' | 'bottom' | 'left' | 'right';

// Board-normalized (0..1) coordinate, as stored in the book.
export type Vec2 = { x: number; y: number };

// The 36 board tiles drawn by the `reveal` event (BOOK_CONTRACT.md "Board").
// Playable tiles sit on a wall band; the 4 star tiles are the corners
// (indices 0/9/18/27) and own the adjacent wall end-strips.
export type TileKind = 'zone' | 'dead' | 'mine' | 'mythosis' | 'star';

export type PlayableTile = {
	tileIndex: number;
	kind: Exclude<TileKind, 'star'>;
	wall: Wall;
	start: number;
	end: number;
	value: number;
};

export type StarTile = {
	tileIndex: number;
	kind: 'star';
	corner: 'TL' | 'TR' | 'BL' | 'BR';
	position: { x: 0 | 1; y: 0 | 1 };
};

export type Tile = PlayableTile | StarTile;
