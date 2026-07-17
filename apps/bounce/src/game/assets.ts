export default {
	// Full-canvas backdrop behind the TV cabinet. Authored at 2039x1000, the same
	// ratio as stateLayout's backgroundRatio.normal, so it cover-fits any window.
	officeBackground: {
		type: 'sprite',
		src: new URL('../../assets/sprites/office-background/office_background.png', import.meta.url).href,
		preload: true,
	},
	// Retro-TV rig (Spine 4.2 export from the keyframe editor). Lives in
	// static/assets like the lines app's spines: the atlas resolves its texture
	// pages relative to its own URL, which the inline bundle would break.
	tv: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/retro-tv/Retro_TV_SlotDVDBounce_.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/retro-tv/Retro_TV_SlotDVDBounce_.json', import.meta.url).href,
		},
		preload: true,
	},
	// Game-board rigs (Spine 4.2, same keyframe toolchain as the TV). Tiles are
	// 100x100 art scaled to the zone band; pops/explosion are one-shot FX at the
	// contact point. Original export filenames are kept so each .atlas finds its
	// texture page next to itself.
	gemTile: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/gem-tile/Slot_Symbol_Gem_SlotDVDBounce_.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/gem-tile/Slot_Symbol_Gem_SlotDVDBounce_.json', import.meta.url).href,
		},
		preload: true,
	},
	cornerTile: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/corner-tile/Corner_Tile_SlotDVDBounce_.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/corner-tile/Corner_Tile_SlotDVDBounce_.json', import.meta.url).href,
		},
		preload: true,
	},
	dvd: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/dvd/DVD_SlotDVDBounce_.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/dvd/DVD_SlotDVDBounce_.json', import.meta.url).href,
		},
		preload: true,
	},
	mineTile: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/mine-tile/Mine_Tile_SlotDVDBounce_.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/mine-tile/Mine_Tile_SlotDVDBounce_.json', import.meta.url).href,
		},
		preload: true,
	},
	mitosisTile: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/mitosis-tile/Mitosis_Cell_SlotDVDBounce_.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/mitosis-tile/Mitosis_Cell_SlotDVDBounce_.json', import.meta.url).href,
		},
		preload: true,
	},
	multPop: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/mult-pop/Multiplier_Pop_SlotDVDBounce_.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/mult-pop/Multiplier_Pop_SlotDVDBounce_.json', import.meta.url).href,
		},
		preload: true,
	},
	boomPop: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/boom-pop/Mine_Pop_BOOM_SlotDVDBounce_.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/boom-pop/Mine_Pop_BOOM_SlotDVDBounce_.json', import.meta.url).href,
		},
		preload: true,
	},
	mitosisPop: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/mitosis-pop/Mitosis_Pop_2_SlotDVDBounce_.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/mitosis-pop/Mitosis_Pop_2_SlotDVDBounce_.json', import.meta.url).href,
		},
		preload: true,
	},
	explosion: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/explosion/Explosion_SlotDVDBounce_.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/explosion/Explosion_SlotDVDBounce_.json', import.meta.url).href,
		},
		preload: true,
	},
};
