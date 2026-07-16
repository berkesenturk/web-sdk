<script lang="ts">
	import { SpineProvider } from 'pixi-svelte';

	import { BOARD_SIZES, ZONE_THICKNESS, TILE_SOURCE_SIZE } from '../game/constants';
	import CornerTileAnimations from './CornerTileAnimations.svelte';

	// One corner multiplier tile. `corner` picks which of the 4 board corners
	// (0 TL, 1 TR, 2 BL, 3 BR); the rig is 100x100 art centered on its root,
	// scaled to the zone band.
	let { corner }: { corner: number } = $props();

	const t = ZONE_THICKNESS;
	const x = corner % 2 === 0 ? t / 2 : BOARD_SIZES.width - t / 2;
	const y = corner < 2 ? t / 2 : BOARD_SIZES.height - t / 2;
</script>

<SpineProvider key="cornerTile" {x} {y} scale={t / TILE_SOURCE_SIZE}>
	<CornerTileAnimations />
</SpineProvider>
