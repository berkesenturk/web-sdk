<script lang="ts">
	import { onMount } from 'svelte';
	import { getContextSpine, SpineSlot, Container, Text } from 'pixi-svelte';
	import { stateBet } from 'state-shared';
	import { waitForTimeout } from 'utils-shared/wait';

	import { getContext } from '../game/context';
	import { fmtZoneVal, contactWallFraction } from '../game/boardGeometry';
	import { REVEAL_STAGGER } from '../game/constants';
	import type { Zone } from '../game/types';

	// Imperative animation control for one zone tile, TvAnimations-style:
	// track 0 holds the base pose (gem reveal / mine+cell idle), track 1 plays
	// the one-shot hit and mixes back out to the held base.
	let { zone }: { zone: Zone } = $props();
	const context = getContext();
	const spine = getContextSpine();

	const kind = zone.isDead ? 'mine' : zone.isGlow ? 'mitosis' : 'gem';
	const hitAnimation = kind === 'mitosis' ? 'split' : 'hit';

	// The gem's baked "0.25x" label can't show real zone values: drop the
	// attachment for good (the anims only key slot rgba, never attachments) and
	// render live text in its place. The text follows the mult bone via
	// SpineSlot; the slot's animated alpha (reveal fade-in, hit flash) is
	// mirrored per frame because spine only fades its own attachments.
	let multAlpha = $state(0);
	if (kind === 'gem') {
		const multSlot = spine.skeleton.findSlot('mult');
		multSlot?.setAttachment(null);
		spine.beforeUpdateWorldTransforms = () => {
			if (multSlot) multAlpha = multSlot.color.a;
		};
	}

	// Round intro. Tiles remount on every reveal (Board keys the each-block by
	// zone object), so the intro runs from onMount rather than boardReset — a
	// freshly mounted tile could miss that broadcast. Board owns the pacing
	// await; turbo skips the stagger.
	onMount(() => {
		if (kind === 'gem') {
			spine.state.setAnimation(0, 'unrevealed', false);
			// value-0 gems are the pre-bet placeholder board: hold the question
			// pose forever (the first reveal event swaps in real zones and remounts)
			if (zone.value <= 0) return;
			const delay = stateBet.isTurbo ? 0 : zone.zoneIndex * REVEAL_STAGGER;
			waitForTimeout(delay).then(() => {
				// completed non-looping entry keeps holding the revealed pose; the
				// tile may have been unmounted mid-wave by the next round's remount
				if (!spine.destroyed) spine.state.setAnimation(0, 'reveal', false);
			});
		} else {
			spine.state.setAnimation(0, 'idle', true);
		}
	});

	// Flash the tile the disc is actually OVER (by contact position), not the one
	// whose zoneIndex was booked — the two diverge because 10 booked zones are
	// folded into 8 visual tiles per wall.
	context.eventEmitter.subscribeOnMount({
		discBounce: (emitterEvent) => {
			const c = contactWallFraction(emitterEvent.position);
			if (!c || c.wall !== zone.wall || c.fraction < zone.start || c.fraction >= zone.end) return;
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
				text={`${fmtZoneVal(zone.value)}x`}
				style={{
					fontFamily: 'proxima-nova',
					fontSize: 32,
					fontWeight: '800',
					fill: 0xffffff,
					stroke: { color: 0x0a4b5c, width: 5 },
				}}
			/>
		</Container>
	</SpineSlot>
{/if}
