<script lang="ts">
	import { onMount } from 'svelte';
	import { getContextSpine } from 'pixi-svelte';

	// DVD rig controller: play the reveal intro once, then loop idle (the floating
	// glow). The plate (the DVD logo) is always visible; movement between contact
	// points is driven by the parent SpineProvider's x/y, not by the rig.
	const spine = getContextSpine();

	onMount(() => {
		spine.state.setAnimation(0, 'reveal', false);
		spine.state.addAnimation(0, 'idle', true, 0);
	});
</script>
