import { stateBet, stateMeta } from 'state-shared';

// Only `normal` is playable for now. The SDK ships `betModeMeta` = DEFAULT_BET_MODE_META
// (BASE/ANTE/SUPERANTE) and defaults `activeBetModeKey` to 'BASE', and `Authenticate`
// never populates modes from the RGS — so without this the bet button would send a
// `mode` with no matching book. Register a single `normal` default mode and select it.
export const initBetMode = () => {
	stateMeta.betModeMeta = {
		normal: {
			mode: 'normal',
			costMultiplier: 1,
			type: 'default',
			parent: '',
			children: '',
			maxWin: 50,
			assets: { icon: '', volatility: '', button: '', dialogImage: '', dialogVolatility: '' },
			text: {
				title: '', dialog: '', button: '', betAmountLabel: '', tickerIdle: '', tickerSpin: '',
			},
		},
	};
	stateBet.activeBetModeKey = 'normal';
};
