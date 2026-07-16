<script lang="ts">
	import { SpineProvider } from 'pixi-svelte';

	import { zoneRect } from '../game/boardGeometry';
	import { TILE_SOURCE_SIZE } from '../game/constants';
	import type { Zone } from '../game/types';
	import ZoneTileAnimations from './ZoneTileAnimations.svelte';

	// One wall-zone spine tile. The rig is picked by the zone's flavor (gem =
	// value, mine = dead, mitosis cell = glow); the 100x100 art is centered on
	// the skeleton root, so it is placed at the zone rect's center and scaled to
	// fill the band. Keeps its real assets + reveal/hit animations in every mode
	// (DESIGN_MODE only recolours the non-asset pieces: play area, corners, disc).
	let { zone }: { zone: Zone } = $props();

	const key = zone.isDead ? 'mineTile' : zone.isGlow ? 'mitosisTile' : 'gemTile';
	const r = zoneRect(zone);
</script>

<SpineProvider
	{key}
	x={r.x + r.w / 2}
	y={r.y + r.h / 2}
	scale={{ x: r.w / TILE_SOURCE_SIZE, y: r.h / TILE_SOURCE_SIZE }}
>
	<ZoneTileAnimations {zone} />
</SpineProvider>
