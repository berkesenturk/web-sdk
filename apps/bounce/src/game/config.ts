// Frontend mirror of the math-sdk bounce config (games/bounce/game_config.py +
// library/configs/config_fe_bounce.json). Bounce is NOT a reel game: no symbols,
// no reels, no paytable. All four modes share the 96.5% RTP target, differing
// in bet cost (1/5/25/100x), volatility and max win (50/100/300/500x stake).
//
// The bet modes the UI actually offers come from the RGS authenticate response
// (state-shared `stateMeta.betModeMeta`); this object is the app-side source of
// truth for the `BetMode` type and design-time defaults.
export default {
	providerName: 'sample_provider',
	gameName: 'bounce',
	gameID: 'bounce',
	rtp: 0.965,
	// cost = bet-cost multiplier (playing the mode stakes cost x betAmount);
	// max_win is in STAKE multiples (base-bet max = max_win x cost).
	betModes: {
		normal: { cost: 1.0, feature: true, buyBonus: false, rtp: 0.965, max_win: 50 },
		corner_boost: { cost: 5.0, feature: true, buyBonus: false, rtp: 0.965, max_win: 100 },
		mythosis: { cost: 25.0, feature: true, buyBonus: false, rtp: 0.965, max_win: 300 },
		mythosis_plus: { cost: 100.0, feature: true, buyBonus: false, rtp: 0.965, max_win: 500 },
	},
};
