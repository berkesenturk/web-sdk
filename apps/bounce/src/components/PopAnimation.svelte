<script lang="ts">
	import { onMount } from 'svelte';
	import { getContextSpine, SpineSlot, Container, Text } from 'pixi-svelte';

	// Plays one spine clip and reports completion so HitFx can unmount it.
	// With `text` set (multiplier pop), the baked "+0.25x" art is dropped and
	// live text rides the pop bone instead, restyled to match the baked art
	// (golden glow text, no backing shape); the slot's animated alpha (fade
	// in/out) is mirrored per frame since spine only fades its own attachments.
	let {
		animationName,
		text,
		oncomplete,
	}: { animationName: string; text?: string; oncomplete: () => void } = $props();
	const spine = getContextSpine();

	let textAlpha = $state(0);
	if (text) {
		const popSlot = spine.skeleton.findSlot('pop');
		popSlot?.setAttachment(null);
		spine.beforeUpdateWorldTransforms = () => {
			if (popSlot) textAlpha = popSlot.color.a;
		};
	}

	onMount(() => {
		const entry = spine.state.setAnimation(0, animationName, false);
		entry.listener = { complete: () => oncomplete() };
	});
</script>

{#if text}
	<SpineSlot slotName="pop">
		<Container alpha={textAlpha}>
			<!-- Styled after the baked "+0.25x" art (196x79): cream core, golden
			     outline, soft golden glow. -->
			<Text
				anchor={0.5}
				{text}
				style={{
					fontFamily: 'proxima-nova',
					fontSize: 58,
					fontWeight: '800',
					fill: 0xfff6d8,
					stroke: { color: 0xe8a33d, width: 8 },
					dropShadow: { color: 0xf9d452, blur: 14, distance: 0, alpha: 0.85 },
				}}
			/>
		</Container>
	</SpineSlot>
{/if}
