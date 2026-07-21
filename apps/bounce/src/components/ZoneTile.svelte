<script lang="ts">
	import { SpineProvider } from 'pixi-svelte';
	import { stateBet } from 'state-shared';
	import { waitForTimeout } from 'utils-shared/wait';

	import { getContext } from '../game/context';
	import { stateGame } from '../game/stateGame.svelte';
	import { tileRect } from '../game/boardGeometry';
	import { TILE_SOURCE_SIZE, REVEAL_STAGGER } from '../game/constants';
	import type { PlayableTile } from '../game/types';
	import ZoneTileAnimations from './ZoneTileAnimations.svelte';

	// One playable wall tile (spine). Per the game rules the tile keeps its "?"
	// face (the gem rig's unrevealed pose) while the round runs: it flips to its
	// real face (gem value / dead 0 / mine / mythosis cell) the moment a DVD
	// strikes it, and any tile still hidden when the round resolves flips in the
	// end-of-round domino wave (instant on skip/turbo). Tiles remount per round
	// (Board keys by tile object), so each round starts hidden again; the
	// pre-bet placeholder board simply never reveals.
	let { tile }: { tile: PlayableTile } = $props();
	const context = getContext();

	let revealed = $state(false);
	let byHit = $state(false);

	context.eventEmitter.subscribeOnMount({
		// The booked tileIndex IS the visual tile (36-tile contract) — no
		// position matching needed.
		discBounce: (emitterEvent) => {
			if (revealed || emitterEvent.tileIndex !== tile.tileIndex) return;
			byHit = true;
			revealed = true;
		},
		// Domino reveal: unhit tiles flip in tileIndex order once the round is
		// resolved. Skipped/turbo rounds flush the whole board at once.
		roundEnd: async () => {
			if (revealed) return;
			if (!stateGame.skip && !stateBet.isTurbo) {
				await waitForTimeout(tile.tileIndex * REVEAL_STAGGER * 3);
			}
			revealed = true;
		},
	});

	const look = $derived(
		tile.kind === 'mine'
			? ('mine' as const)
			: tile.kind === 'mythosis'
				? ('mitosis' as const)
				: ('gem' as const), // zone and dead share the gem rig (dead = gray 0)
	);
	// Hidden tiles always render the gem rig — it hosts the "?" pose.
	const key = $derived(
		!revealed || look === 'gem' ? 'gemTile' : look === 'mine' ? 'mineTile' : 'mitosisTile',
	);
	const r = tileRect(tile);
</script>

{#key `${key}:${revealed}`}
	<SpineProvider
		{key}
		x={r.x + r.w / 2}
		y={r.y + r.h / 2}
		scale={{ x: r.w / TILE_SOURCE_SIZE, y: r.h / TILE_SOURCE_SIZE }}
	>
		<ZoneTileAnimations {tile} {look} {revealed} {byHit} />
	</SpineProvider>
{/key}
