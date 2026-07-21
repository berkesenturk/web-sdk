import type { GameType, ModeName, Tile, Vec2 } from './types';
import type { Bet, BookEventOfType } from './typesBookEvent';

// Reactive board state the renderer draws from. The board (tiles) is set once per
// round by the `reveal` handler; the running point total is advanced by the
// `bounce`/`corner` handlers; the live disc list grows on `split` and shrinks on
// mine deaths. Disc motion itself is component-local (driven by emitter events),
// not stored here.

// One live DVD: dvdIndex 0 spawns at the reveal's discStart; split children
// spawn at their split contact point.
export type DiscEntry = { dvdIndex: number; spawn: Vec2 | null };

// Pre-bet placeholder board: 32 hidden playable tiles (question faces) + the 4
// star corners, matching the real 36-tile layout (BOOK_CONTRACT.md board map).
const STAR_TILES: Tile[] = [
	{ tileIndex: 0, kind: 'star', corner: 'TL', position: { x: 0, y: 0 } },
	{ tileIndex: 9, kind: 'star', corner: 'TR', position: { x: 1, y: 0 } },
	{ tileIndex: 18, kind: 'star', corner: 'BL', position: { x: 0, y: 1 } },
	{ tileIndex: 27, kind: 'star', corner: 'BR', position: { x: 1, y: 1 } },
];

const placeholderTiles = (): Tile[] => {
	const tiles: Tile[] = [...STAR_TILES];
	const walls = [
		{ wall: 'top' as const, base: 0 },
		{ wall: 'right' as const, base: 9 },
		{ wall: 'bottom' as const, base: 18 },
		{ wall: 'left' as const, base: 27 },
	];
	for (const { wall, base } of walls) {
		for (let b = 1; b <= 8; b++) {
			tiles.push({
				tileIndex: base + b,
				kind: 'zone',
				wall,
				start: b / 10,
				end: (b + 1) / 10,
				value: 0,
			});
		}
	}
	return tiles.sort((a, b) => a.tileIndex - b.tileIndex);
};

export const stateGame = $state({
	gameType: 'basegame' as GameType,
	mode: 'normal' as ModeName,
	maxDvds: 1,
	tiles: placeholderTiles(),
	discStart: undefined as { x: number; y: number; direction: number } | undefined,
	discs: [{ dvdIndex: 0, spawn: null }] as DiscEntry[],
	runningTotal: 0,
	// Set true by a mid-round SPIN press to fast-forward the rest of the round's
	// animation to its result; reset to false at the start of every round.
	skip: false,
	// CRT scanlines overlay on the screen (MENÜ toggle). Display preference —
	// deliberately untouched by reset()/settle(), so it survives rounds.
	scanlines: true,
	// Dev-only round speed multiplier (DevBar slider); 1 = normal speed.
	devSpeed: 1,
	// Playback bookkeeping for the dev-only replay button: the last bet played
	// and whether a book is currently animating (set by utils.playBet).
	lastBet: undefined as Bet | undefined,
	betPlaying: false,
});

// Apply a reveal event's board to state without animation (used by both the
// reveal handler and resume reconstruction).
const settle = (revealEvent?: BookEventOfType<'reveal'>) => {
	if (!revealEvent) return;
	stateGame.mode = revealEvent.mode;
	stateGame.maxDvds = revealEvent.maxDvds;
	stateGame.tiles = revealEvent.tiles;
	stateGame.discStart = revealEvent.discStart;
	stateGame.discs = [{ dvdIndex: 0, spawn: null }];
	stateGame.runningTotal = 0;
};

// Clear transient round state before a new spin.
const reset = () => {
	stateGame.runningTotal = 0;
	stateGame.skip = false;
	stateGame.discs = [{ dvdIndex: 0, spawn: null }];
};

// Skip signal for handler-paced waits: a promise that resolves when the
// player skips mid-round. Registering via a callback list (not polling!) —
// chained short setTimeout polls get throttled to ~1s each in
// background/occluded pages, which froze whole rounds.
let skipResolvers: Array<() => void> = [];
const requestSkip = () => {
	stateGame.skip = true;
	for (const resolve of skipResolvers) resolve();
	skipResolvers = [];
};
const untilSkip = () =>
	new Promise<void>((resolve) => {
		if (stateGame.skip) resolve();
		else skipResolvers.push(resolve);
	});

// Wipe the board back to the hidden placeholder skeleton (all "?" tiles, no
// disc) — used when the bet mode changes so the previous mode's revealed
// board doesn't linger while the new mode's first round loads.
const clearBoard = () => {
	stateGame.tiles = placeholderTiles();
	stateGame.discStart = undefined;
	stateGame.discs = [{ dvdIndex: 0, spawn: null }];
	stateGame.runningTotal = 0;
};

export const stateGameDerived = {
	settle,
	reset,
	clearBoard,
	requestSkip,
	untilSkip,
};
