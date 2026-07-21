import { stateBet, stateMeta } from 'state-shared';

import config from './config';
import type { BetMode } from './types';

// Register the four real bet modes. The SDK ships `betModeMeta` =
// DEFAULT_BET_MODE_META (BASE/ANTE/SUPERANTE) and defaults `activeBetModeKey`
// to 'BASE', and `Authenticate` never populates modes from the RGS — so without
// this the bet button would send a `mode` with no matching book. The play
// request sends stateBet.activeBetModeKey verbatim, which the wall-sign mode
// selector (ModeSelector) switches between rounds.
export const initBetMode = () => {
	stateMeta.betModeMeta = Object.fromEntries(
		(Object.keys(config.betModes) as BetMode[]).map((mode) => [
			mode,
			{
				mode,
				costMultiplier: config.betModes[mode].cost,
				// 'activate' engages the SDK's betCostMultiplier(): the BET label
				// shows betAmount x cost and the balance clamp uses the real stake.
				type: 'activate',
				parent: '',
				children: '',
				maxWin: config.betModes[mode].max_win,
				assets: { icon: '', volatility: '', button: '', dialogImage: '', dialogVolatility: '' },
				text: {
					title: '', dialog: '', button: '', betAmountLabel: '', tickerIdle: '', tickerSpin: '',
				},
			},
		]),
	);
	stateBet.activeBetModeKey = 'normal';
};
