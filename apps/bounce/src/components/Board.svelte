<script lang="ts">
	import { Graphics, type GraphicsProps } from 'pixi-svelte';
	import { stateBet } from 'state-shared';
	import { waitForTimeout } from 'utils-shared/wait';

	import { getContext } from '../game/context';
	import { stateGame } from '../game/stateGame.svelte';
	import {
		BOARD_SIZES,
		ZONE_THICKNESS,
		DESIGN_MODE,
		DESIGN_COLORS,
	} from '../game/constants';
	import type { PlayableTile } from '../game/types';
	import ZoneTile from './ZoneTile.svelte';
	import CornerTile from './CornerTile.svelte';

	const context = getContext();
	const t = ZONE_THICKNESS;

	// Tiles start the round hidden ("?" until struck — see ZoneTile), so there
	// is no intro wave to pace anymore; keep a short beat so the fresh hidden
	// board reads before the disc spawns.
	context.eventEmitter.subscribeOnMount({
		boardReset: async () => {
			if (!stateBet.isTurbo && !stateGame.skip) await waitForTimeout(400);
		},
	});

	// The book's 36 tiles land 1:1 on the 10-cell grid: 8 playable tiles per
	// wall (spine tiles, ZoneTile) between the 4 corner star squares
	// (CornerTile). Hit feedback matches by the booked tileIndex directly.
	const playableTiles = $derived(
		stateGame.tiles.filter((tile): tile is PlayableTile => tile.kind !== 'star'),
	);

	// Static board: inner background and frame. All hit feedback is the tiles'
	// own hit anims.
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
{#each playableTiles as tile (tile)}
	<ZoneTile {tile} />
{/each}
