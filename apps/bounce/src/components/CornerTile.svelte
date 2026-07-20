<script lang="ts">
	import { SpineProvider, Rectangle } from 'pixi-svelte';

	import { stateGame } from '../game/stateGame.svelte';
	import { BOARD_SIZES, ZONE_THICKNESS, TILE_SOURCE_SIZE } from '../game/constants';
	import CornerTileAnimations from './CornerTileAnimations.svelte';

	// One corner multiplier tile. `corner` picks which of the 4 board corners
	// (0 TL, 1 TR, 2 BL, 3 BR); the rig is 100x100 art centered on its root,
	// scaled to the zone band.
	let { corner }: { corner: number } = $props();

	const t = ZONE_THICKNESS;
	const x = corner % 2 === 0 ? t / 2 : BOARD_SIZES.width - t / 2;
	const y = corner < 2 ? t / 2 : BOARD_SIZES.height - t / 2;

	// CORNER RUSH visual mode: the corners pulse (scale 1→1.1→1 + a white wash
	// standing in for brightness 1→1.45→1 — pixi-svelte has no filter prop),
	// 0.9s ease-in-out infinite. `wave` runs 0→1→0 per period via cosine.
	const PULSE_MS = 900;
	let wave = $state(0);
	$effect(() => {
		if (stateGame.visualMode !== 'corner_rush') {
			wave = 0;
			return;
		}
		let raf = 0;
		const start = performance.now();
		const loop = (now: number) => {
			const phase = ((now - start) % PULSE_MS) / PULSE_MS;
			wave = 0.5 - 0.5 * Math.cos(2 * Math.PI * phase);
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(raf);
	});
	const pulseScale = $derived((t / TILE_SOURCE_SIZE) * (1 + 0.1 * wave));
</script>

<SpineProvider key="cornerTile" {x} {y} scale={pulseScale}>
	<CornerTileAnimations />
</SpineProvider>
{#if wave > 0}
	<Rectangle
		{x}
		{y}
		anchor={0.5}
		width={t * (1 + 0.1 * wave)}
		height={t * (1 + 0.1 * wave)}
		borderRadius={12}
		backgroundColor={0xffffff}
		backgroundAlpha={0.3 * wave}
	/>
{/if}
