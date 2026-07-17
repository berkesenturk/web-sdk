<script lang="ts">
	import { onMount } from 'svelte';
	import { getContextSpine } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { DISC_COLOR_CYCLE } from '../game/constants';

	// DVD rig controller: play the spawn intro once, then loop the fly float.
	// Every contact (wall bounce / corner) plays the rig's squash one-shot and
	// steps the plate tint to the next colour in the classic DVD-logo cycle.
	// Movement between contact points is the parent SpineProvider's x/y.
	let { dvdIndex }: { dvdIndex: number } = $props();

	const context = getContext();
	const spine = getContextSpine();

	// The rig remounts every round (Disc hides on roundEnd), so each round starts
	// fresh at the first colour.
	let cycleIndex = 0;
	const plateSlot = spine.skeleton.findSlot('plate');
	const applyColor = () => {
		if (!plateSlot) return;
		const c = DISC_COLOR_CYCLE[cycleIndex % DISC_COLOR_CYCLE.length];
		plateSlot.color.set(((c >> 16) & 0xff) / 255, ((c >> 8) & 0xff) / 255, (c & 0xff) / 255, 1);
	};

	const impact = (animation: string) => {
		cycleIndex += 1;
		applyColor();
		spine.state.setAnimation(0, animation, false);
		spine.state.addAnimation(0, 'fly', true, 0);
	};

	context.eventEmitter.subscribeOnMount({
		discBounce: (emitterEvent) => {
			if (emitterEvent.dvdIndex === dvdIndex) impact('bounce');
		},
		discCorner: (emitterEvent) => {
			if (emitterEvent.dvdIndex === dvdIndex) impact('corner-hit');
		},
	});

	onMount(() => {
		applyColor();
		spine.state.setAnimation(0, 'spawn', false);
		spine.state.addAnimation(0, 'fly', true, 0);
	});
</script>
