<script lang="ts">
	import { Container, Graphics, Text, type GraphicsProps } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { stateGame } from '../game/stateGame.svelte';
	import {
		BOARD_SIZES,
		TV_RIG_SIZES,
		TV_SCREEN_RECT,
		TV_WIDEN,
		CONTROL_BAND_RATIO,
		DESIGN_MODE,
		DESIGN_COLORS,
	} from '../game/constants';
	import { tvTransform } from '../game/tvLayout';
	import TvFrame from './TvFrame.svelte';
	import ScreenHud from './ScreenHud.svelte';
	import Board from './Board.svelte';
	import Disc from './Disc.svelte';
	import HitFx from './HitFx.svelte';

	const context = getContext();

	// Fit the TV rig into the whole canvas, centered (shared with the cabinet
	// menu layer — see game/tvLayout.ts). Canvas coordinates (no MainContainer):
	// with the background art gone the TV IS the scene, so it sizes against the
	// real window instead of the letterboxed main layout. The control UI overlays
	// the cabinet bottom rather than reserving a band.
	const tv = $derived(tvTransform(context.stateLayoutDerived.canvasSizes()));

	// Fit the square board into the (visually widened) square screen cutout by
	// height, centred horizontally; /TV_WIDEN cancels the cabinet stretch.
	const boardScale = TV_SCREEN_RECT.height / BOARD_SIZES.height;
	const boardX =
		TV_SCREEN_RECT.x +
		(TV_SCREEN_RECT.width - (BOARD_SIZES.width * boardScale) / TV_WIDEN) / 2;

	// DESIGN_MODE: no TV — fit the square board large into the whole canvas (minus
	// the bottom control band), centered.
	const designBoard = $derived.by(() => {
		const canvas = context.stateLayoutDerived.canvasSizes();
		const avail = canvas.height * (1 - CONTROL_BAND_RATIO);
		const scale = Math.min(canvas.width / BOARD_SIZES.width, avail / BOARD_SIZES.height) * 0.98;
		return {
			scale,
			x: (canvas.width - BOARD_SIZES.width * scale) / 2,
			y: (avail - BOARD_SIZES.height * scale) / 2,
		};
	});

	const discs = $derived(Array.from({ length: stateGame.dvdCount }, (_value, index) => index));

	// Clip board content (zone flashes, discs) to the screen cutout.
	const drawScreenMask: GraphicsProps['draw'] = (g) => {
		g.roundRect(0, 0, BOARD_SIZES.width, BOARD_SIZES.height, 24);
		g.fill(0xffffff);
	};

	// Colour key for the design view, drawn in the empty play area.
	const legend = [
		{ label: 'GEM TILE (value)', color: DESIGN_COLORS.gem },
		{ label: 'MINE TILE (dead)', color: DESIGN_COLORS.mine },
		{ label: 'MITOSIS TILE (glow)', color: DESIGN_COLORS.mitosis },
		{ label: 'DISC', color: DESIGN_COLORS.disc },
		{ label: 'CORNER (multiplier)', color: DESIGN_COLORS.corner },
	];
</script>

{#snippet boardContent()}
	<Graphics isMask draw={drawScreenMask} />
	<Board />
	{#each discs as dvdIndex (dvdIndex)}
		<Disc {dvdIndex} />
	{/each}
	<HitFx />
	<ScreenHud />
{/snippet}

{#if DESIGN_MODE}
	<Container x={designBoard.x} y={designBoard.y} scale={designBoard.scale}>
		{@render boardContent()}
		{#each legend as item, i (item.label)}
			<Text
				x={BOARD_SIZES.width / 2}
				y={BOARD_SIZES.height / 2 - (legend.length - 1) * 29 + i * 58}
				anchor={0.5}
				text={`● ${item.label}`}
				style={{
					fontFamily: 'proxima-nova',
					fontSize: 34,
					fontWeight: '700',
					fill: item.color,
				}}
			/>
		{/each}
	</Container>
{:else}
	<Container x={tv.x} y={tv.y} scale={{ x: tv.scale * TV_WIDEN, y: tv.scale }}>
		<TvFrame />
		<Container
			x={boardX}
			y={TV_SCREEN_RECT.y}
			scale={{ x: boardScale / TV_WIDEN, y: boardScale }}
		>
			{@render boardContent()}
		</Container>
	</Container>
{/if}
