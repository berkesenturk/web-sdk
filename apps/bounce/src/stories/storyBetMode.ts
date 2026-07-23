import { stateBet } from 'state-shared';

import { initBetMode } from '../game/betMode';
import type { BetMode } from '../game/types';

// Storybook mounts <Game> directly and never runs routes/+layout.svelte, where
// the four real bet modes are registered. Without them the cabinet falls back
// to the SDK's BASE/x1 meta while a book whose cents are already scaled by the
// mode's cost plays — BAHIS then shows the wrong stake and EARNED reads as a
// multiple of TOTAL X (x100 in mythosis+). Every mode story selects its own.
export const useBetMode = (mode: BetMode) => {
	initBetMode();
	stateBet.activeBetModeKey = mode;
};
