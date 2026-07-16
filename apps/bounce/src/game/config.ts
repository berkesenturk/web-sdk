// Frontend mirror of the math-sdk bounce config (games/bounce/game_config.py +
// library/configs/config_fe_bounce.json). Bounce is NOT a reel game: no symbols,
// no reels, no paytable. All four modes are cost 1.0 and share the 96.5% RTP
// target, differing only in volatility / max win (effective_cap 50/100/300/500x).
//
// The bet modes the UI actually offers come from the RGS authenticate response
// (state-shared `stateMeta.betModeMeta`); this object is the app-side source of
// truth for the `BetMode` type and design-time defaults.
export default {
	providerName: 'sample_provider',
	gameName: 'bounce',
	gameID: 'bounce',
	rtp: 0.965,
	betModes: {
		normal: { cost: 1.0, feature: true, buyBonus: false, rtp: 0.965, max_win: 50 },
		corner_boost: { cost: 1.0, feature: true, buyBonus: false, rtp: 0.965, max_win: 100 },
		glow_zone: { cost: 1.0, feature: true, buyBonus: false, rtp: 0.965, max_win: 300 },
		bounce_roulette: { cost: 1.0, feature: true, buyBonus: false, rtp: 0.965, max_win: 500 },
	},
};
