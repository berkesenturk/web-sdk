import type { GameType, ModeName, DvdMode, Zone } from './types';
import type { BookEventOfType } from './typesBookEvent';

// Reactive board state the renderer draws from. The board (zones) is set once per
// round by the `reveal` handler; the running point total is advanced by the
// `bounce`/`corner` handlers. Disc motion itself is component-local (driven by
// emitter events), not stored here.

// Pre-bet placeholder board: value-0 tiles so the screen shows unrevealed
// question tiles instead of an empty band before the first reveal replaces
// them (ZoneTileAnimations only schedules `reveal` when zone.value > 0).
// 8 per wall matches the design grid (10-cell edge = 2 corners + 8 tiles).
const placeholderZones = (): Zone[] =>
	(['top', 'right', 'bottom', 'left'] as const).flatMap((wall, wallIndex) =>
		Array.from({ length: 8 }, (_, i) => ({
			zoneIndex: wallIndex * 8 + i,
			wall,
			start: i / 8,
			end: (i + 1) / 8,
			value: 0,
			isGlow: false,
			isDead: false,
		})),
	);

export const stateGame = $state({
	gameType: 'basegame' as GameType,
	mode: 'normal' as ModeName,
	dvdMode: 'independent' as DvdMode,
	dvdCount: 1,
	zones: placeholderZones(),
	discStart: undefined as { x: number; y: number; direction: number } | undefined,
	runningTotal: 0,
	// Set true by a mid-round SPIN press to fast-forward the rest of the round's
	// animation to its result; reset to false at the start of every round.
	skip: false,
	// CRT scanlines overlay on the screen (MENÜ toggle). Display preference —
	// deliberately untouched by reset()/settle(), so it survives rounds.
	scanlines: true,
});

// Apply a reveal event's board to state without animation (used by both the
// reveal handler and resume reconstruction).
const settle = (revealEvent?: BookEventOfType<'reveal'>) => {
	if (!revealEvent) return;
	stateGame.mode = revealEvent.mode;
	stateGame.dvdMode = revealEvent.dvdMode;
	stateGame.dvdCount = revealEvent.dvdCount;
	stateGame.zones = revealEvent.zones;
	stateGame.discStart = revealEvent.discStart;
	stateGame.runningTotal = 0;
};

// Clear transient round state before a new spin.
const reset = () => {
	stateGame.runningTotal = 0;
	stateGame.skip = false;
};

export const stateGameDerived = {
	settle,
	reset,
};
