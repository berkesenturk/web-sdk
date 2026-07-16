<script lang="ts">
	import { Graphics, type GraphicsProps } from 'pixi-svelte';
	import { stateBet } from 'state-shared';
	import { waitForTimeout } from 'utils-shared/wait';

	import { getContext } from '../game/context';
	import { stateGame } from '../game/stateGame.svelte';
	import { toVisualZones } from '../game/boardGeometry';
	import {
		BOARD_SIZES,
		ZONE_THICKNESS,
		REVEAL_WAVE_DURATION,
		DESIGN_MODE,
		DESIGN_COLORS,
	} from '../game/constants';
	import ZoneTile from './ZoneTile.svelte';
	import CornerTile from './CornerTile.svelte';

	const context = getContext();
	const t = ZONE_THICKNESS;

	// The tiles' intro wave runs on mount (they remount per round, keyed by zone
	// object below); this await paces the reveal book event so the first bounce
	// doesn't launch mid-wave.
	context.eventEmitter.subscribeOnMount({
		boardReset: async () => {
			if (!stateBet.isTurbo && !stateGame.skip) await waitForTimeout(REVEAL_WAVE_DURATION);
		},
	});

	// Design grid: 8 tiles per wall (10-cell edge with the corners). Books carry
	// 10 zones per wall, folded into 8 tiles here; hit feedback is matched by the
	// disc's contact POSITION (see ZoneTileAnimations / HitFx), so the tile the
	// disc is actually over reacts — not the one whose zoneIndex was booked.
	const visualZones = $derived(toVisualZones(stateGame.zones));

	// Static board: inner background and frame. The wall zones are spine tiles
	// (ZoneTile), the 4 corners are spine tiles too (CornerTile); all hit
	// feedback is the tiles' own hit anims.
	const drawBoard: GraphicsProps['draw'] = (g) => {
		g.roundRect(t, t, BOARD_SIZES.width - 2 * t, BOARD_SIZES.height - 2 * t, 4);
		g.fill(DESIGN_MODE ? { color: DESIGN_COLORS.playArea } : { color: 0x0a0a16, alpha: 0.65 });
		g.roundRect(0, 0, BOARD_SIZES.width, BOARD_SIZES.height, 6);
		g.stroke(
			DESIGN_MODE
				? { color: DESIGN_COLORS.frame, width: 4, alpha: 1 }
				: { color: 0x33335a, width: 2, alpha: 0.8 },
		);
	};
</script>

<Graphics draw={drawBoard} />
{#each [0, 1, 2, 3] as corner (corner)}
	<CornerTile {corner} />
{/each}
{#each visualZones as zone (zone)}
	<ZoneTile {zone} />
{/each}
