<script lang="ts">
	import { onMount } from 'svelte';
	import { getContextSpine } from 'pixi-svelte';

	import { DISC_COLOR_CYCLE } from '../game/constants';

	// Rig controller for a simulated clone disc (see CloneDiscs). Same visual
	// language as the real disc's DiscAnimations — spawn intro, fly loop, squash
	// + tint step per contact — but driven by the parent's `bounces` counter
	// (the clone's contacts are simulated, not emitter events).
	let { bounces }: { bounces: number } = $props();

	const spine = getContextSpine();
	const plateSlot = spine.skeleton.findSlot('plate');
	const applyColor = (index: number) => {
		if (!plateSlot) return;
		const c = DISC_COLOR_CYCLE[index % DISC_COLOR_CYCLE.length];
		plateSlot.color.set(((c >> 16) & 0xff) / 255, ((c >> 8) & 0xff) / 255, (c & 0xff) / 255, 1);
	};

	let seen = 0;
	$effect(() => {
		if (bounces === seen) return;
		seen = bounces;
		applyColor(bounces);
		spine.state.setAnimation(0, 'bounce', false);
		spine.state.addAnimation(0, 'fly', true, 0);
	});

	onMount(() => {
		applyColor(0);
		spine.state.setAnimation(0, 'spawn', false);
		spine.state.addAnimation(0, 'fly', true, 0);
	});
</script>
