<script lang="ts">
	import { SpineProvider } from 'pixi-svelte';
	import { stateBet } from 'state-shared';
	import { waitForTimeout } from 'utils-shared/wait';

	import { getContext } from '../game/context';
	import { stateGame } from '../game/stateGame.svelte';
	import { zoneRect, isVisualMitosis, contactWallFraction } from '../game/boardGeometry';
	import { TILE_SOURCE_SIZE, REVEAL_STAGGER } from '../game/constants';
	import type { Zone } from '../game/types';
	import ZoneTileAnimations from './ZoneTileAnimations.svelte';

	// One wall-zone spine tile. Per the game rules the tile keeps its "?" face
	// (the gem rig's unrevealed pose) while the round runs: it flips to its real
	// face (gem value / mine / mitosis cell) the moment a DVD strikes it, and
	// any tile still hidden when the round resolves flips in the end-of-round
	// domino wave (instant on skip/turbo). Tiles remount per round (Board keys
	// by zone object), so each round starts hidden again; the pre-bet
	// placeholder board simply never reveals. {#key} remounts the rig on the
	// flip (and when a MYTHOSIS visual mode dresses a plain gem up as a mitosis
	// cell mid-board — art only, booked behaviour kept; see isVisualMitosis).
	let { zone }: { zone: Zone } = $props();
	const context = getContext();

	let revealed = $state(false);
	let byHit = $state(false);

	// Match by the disc's contact POSITION, not zoneIndex — books carry 10
	// zones per wall folded into 8 visual tiles, so only the tile the disc is
	// actually over may flip.
	const hitsMe = (position: { x: number; y: number }) => {
		const c = contactWallFraction(position);
		return c !== null && c.wall === zone.wall && c.fraction >= zone.start && c.fraction < zone.end;
	};

	// Applying a mode from the selector resets the board: every tile flips
	// back to its "?" face, so the switch reads as a fresh gameboard instead
	// of last round's revealed values wearing new art.
	let lastMode = stateGame.visualMode;
	$effect(() => {
		const mode = stateGame.visualMode;
		if (mode === lastMode) return;
		lastMode = mode;
		revealed = false;
		byHit = false;
	});

	context.eventEmitter.subscribeOnMount({
		discBounce: (emitterEvent) => {
			if (revealed || !hitsMe(emitterEvent.position)) return;
			byHit = true;
			revealed = true;
		},
		// Domino reveal: unhit tiles flip in zoneIndex order once the round is
		// resolved. Skipped/turbo rounds flush the whole board at once.
		roundEnd: async () => {
			if (revealed) return;
			if (!stateGame.skip && !stateBet.isTurbo) {
				await waitForTimeout(zone.zoneIndex * REVEAL_STAGGER * 3);
			}
			revealed = true;
		},
	});

	const look = $derived(
		zone.isDead
			? ('mine' as const)
			: zone.isGlow || isVisualMitosis(zone, stateGame.visualMode)
				? ('mitosis' as const)
				: ('gem' as const),
	);
	// Hidden tiles always render the gem rig — it hosts the "?" pose.
	const key = $derived(
		!revealed || look === 'gem' ? 'gemTile' : look === 'mine' ? 'mineTile' : 'mitosisTile',
	);
	const r = zoneRect(zone);
</script>

{#key `${key}:${revealed}`}
	<SpineProvider
		{key}
		x={r.x + r.w / 2}
		y={r.y + r.h / 2}
		scale={{ x: r.w / TILE_SOURCE_SIZE, y: r.h / TILE_SOURCE_SIZE }}
	>
		<ZoneTileAnimations {zone} {look} {revealed} {byHit} />
	</SpineProvider>
{/key}
