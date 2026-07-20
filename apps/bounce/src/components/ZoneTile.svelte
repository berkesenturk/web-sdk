<script lang="ts">
	import { SpineProvider } from 'pixi-svelte';

	import { stateGame } from '../game/stateGame.svelte';
	import { zoneRect, isVisualMitosis } from '../game/boardGeometry';
	import { TILE_SOURCE_SIZE } from '../game/constants';
	import type { Zone } from '../game/types';
	import ZoneTileAnimations from './ZoneTileAnimations.svelte';

	// One wall-zone spine tile. The rig is picked by the zone's flavor (gem =
	// value, mine = dead, mitosis cell = glow); the 100x100 art is centered on
	// the skeleton root, so it is placed at the zone rect's center and scaled to
	// fill the band. Keeps its real assets + reveal/hit animations in every mode
	// (DESIGN_MODE only recolours the non-asset pieces: play area, corners, disc).
	// MYTHOSIS visual modes dress some plain gems up as mitosis cells (art only —
	// see isVisualMitosis); {#key} remounts the rig when the mode flips mid-board.
	let { zone }: { zone: Zone } = $props();

	const look = $derived(
		zone.isDead
			? ('mine' as const)
			: zone.isGlow || isVisualMitosis(zone, stateGame.visualMode)
				? ('mitosis' as const)
				: ('gem' as const),
	);
	const key = $derived(
		look === 'mine' ? 'mineTile' : look === 'mitosis' ? 'mitosisTile' : 'gemTile',
	);
	const r = zoneRect(zone);
</script>

{#key key}
	<SpineProvider
		{key}
		x={r.x + r.w / 2}
		y={r.y + r.h / 2}
		scale={{ x: r.w / TILE_SOURCE_SIZE, y: r.h / TILE_SOURCE_SIZE }}
	>
		<ZoneTileAnimations {zone} {look} />
	</SpineProvider>
{/key}
