<script lang="ts">
	import { onMount } from 'svelte';

	// Bounce bundles no Pixi assets, so there is nothing to load inside the canvas
	// (the HTML loaders in +layout.svelte cover the initial splash). Proceed to the
	// game as soon as the Pixi app is ready.
	type Props = { onloaded: () => void };
	const props: Props = $props();

	onMount(() => props.onloaded());
</script>
