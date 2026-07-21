<script lang="ts">
	import { onMount } from 'svelte';
	import { getContextSpine } from 'pixi-svelte';

	import { getContext } from '../game/context';

	// Corner tile controller: idle star loop on track 0, hit flash on track 1.
	// Only the struck corner flashes — discCorner carries the corner position
	// (coords exactly 0/1) computed by the corner book-event handler.
	let { corner }: { corner: number } = $props();
	const context = getContext();
	const spine = getContextSpine();

	// Same corner numbering as CornerTile: 0 TL, 1 TR, 2 BL, 3 BR.
	const cornerX = corner % 2;
	const cornerY = corner < 2 ? 0 : 1;

	onMount(() => {
		spine.state.setAnimation(0, 'idle', true);
	});

	context.eventEmitter.subscribeOnMount({
		discCorner: (emitterEvent) => {
			if (emitterEvent.position.x !== cornerX || emitterEvent.position.y !== cornerY) return;
			spine.state.setAnimation(1, 'hit', false);
			spine.state.addEmptyAnimation(1, 0.2, 0);
		},
	});
</script>
