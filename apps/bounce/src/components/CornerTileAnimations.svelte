<script lang="ts">
	import { onMount } from 'svelte';
	import { getContextSpine } from 'pixi-svelte';

	import { getContext } from '../game/context';

	// Corner tile controller: idle star loop on track 0, hit flash on track 1.
	// The corner book event carries no corner index, so all four corners flash
	// together on a corner hit.
	const context = getContext();
	const spine = getContextSpine();

	onMount(() => {
		spine.state.setAnimation(0, 'idle', true);
	});

	context.eventEmitter.subscribeOnMount({
		discCorner: () => {
			spine.state.setAnimation(1, 'hit', false);
			spine.state.addEmptyAnimation(1, 0.2, 0);
		},
	});
</script>
