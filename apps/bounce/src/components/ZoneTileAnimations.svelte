<script lang="ts">
	import { onMount } from 'svelte';
	import { getContextSpine, SpineSlot, Container, Text } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { stateGame } from '../game/stateGame.svelte';
	import { fmtZoneVal } from '../game/boardGeometry';
	import type { PlayableTile } from '../game/types';

	// Imperative animation control for one playable tile, TvAnimations-style:
	// track 0 holds the base pose, track 1 plays the one-shot hit and mixes
	// back out to the held base. The parent remounts this component whenever
	// the tile flips ({#key} on revealed/rig), so the phase is fixed at mount:
	// hidden = the gem rig's "?" hold; revealed = the real face, with the hit
	// flash layered on when the flip was caused by a strike (byHit).
	let {
		tile,
		look,
		revealed,
		byHit,
	}: {
		tile: PlayableTile;
		look: 'gem' | 'mine' | 'mitosis';
		revealed: boolean;
		byHit: boolean;
	} = $props();
	const context = getContext();
	const spine = getContextSpine();

	const kind = revealed ? look : 'hidden';
	const hitAnimation = kind === 'mitosis' ? 'split' : 'hit';

	// The gem rig (which also hosts the hidden "?" face) bakes a "0.25x" label
	// that can't show real tile values: drop the attachment for good (the anims
	// only key slot rgba, never attachments) and render live text in its place
	// once the gem is revealed. The text follows the mult bone via SpineSlot;
	// the slot's animated alpha (reveal fade-in, hit flash) is mirrored per
	// frame because spine only fades its own attachments.
	let multAlpha = $state(0);
	if (kind === 'gem' || kind === 'hidden') {
		const multSlot = spine.skeleton.findSlot('mult');
		multSlot?.setAttachment(null);
		if (kind === 'gem') {
			spine.beforeUpdateWorldTransforms = () => {
				if (multSlot) multAlpha = multSlot.color.a;
			};
		}
	}

	// Rules: value colors by tier — green 0–1x, cyan 1–5x, gold 5–15x,
	// red/pink 15x+; dead tiles (value 0) show a gray "0".
	const tierFill =
		tile.value <= 0
			? 0x9aa3b5
			: tile.value < 1
				? 0x7dff9c
				: tile.value < 5
					? 0x5ad7ff
					: tile.value < 15
						? 0xffd94d
						: 0xff5a7a;

	onMount(() => {
		if (kind === 'hidden') {
			// Held "?" pose; the parent remounts us with revealed=true to flip.
			spine.state.setAnimation(0, 'unrevealed', false);
			return;
		}
		if (kind === 'gem') {
			spine.state.setAnimation(0, 'reveal', false);
		} else {
			spine.state.setAnimation(0, 'idle', true);
		}
		if (byHit) {
			spine.state.setAnimation(1, hitAnimation, false);
			spine.state.addEmptyAnimation(1, 0.2, 0);
		}
	});

	// Repeat strikes on an already-revealed tile flash again, matched by the
	// booked tileIndex. (The flip's own flash plays from onMount; a freshly
	// remounted tile subscribes after that broadcast finishes, so the revealing
	// hit never double-fires.)
	context.eventEmitter.subscribeOnMount({
		discBounce: (emitterEvent) => {
			// A mid-round SPIN (skip) cuts to the result — don't flash the rest.
			if (kind === 'hidden' || stateGame.skip) return;
			if (emitterEvent.tileIndex !== tile.tileIndex) return;
			spine.state.setAnimation(1, hitAnimation, false);
			spine.state.addEmptyAnimation(1, 0.2, 0);
		},
	});
</script>

{#if kind === 'gem'}
	<SpineSlot slotName="mult">
		<Container alpha={multAlpha}>
			<Text
				anchor={0.5}
				text={tile.value > 0 ? `${fmtZoneVal(tile.value)}x` : '0'}
				style={{
					fontFamily: 'proxima-nova',
					fontSize: 32,
					fontWeight: '800',
					fill: tierFill,
					stroke: { color: 0x0a2430, width: 5 },
				}}
			/>
		</Container>
	</SpineSlot>
{/if}
