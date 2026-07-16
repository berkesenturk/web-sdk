<script lang="ts">
	import { Rectangle } from 'pixi-svelte';

	import { getContext } from '../game/context';

	const context = getContext();
	const canvas = $derived(context.stateLayoutDerived.canvasSizes());
</script>

<!-- flat dark base; the TV scene is the whole visual -->
<Rectangle {...canvas} backgroundColor={0x05060f} zIndex={-3} />
