<script lang="ts">
	import { Rectangle, Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';

	const context = getContext();
	const canvas = $derived(context.stateLayoutDerived.canvasSizes());

	// Office backdrop, cover-fit to the canvas: one uniform scale (the larger of
	// the two axis ratios) so it always fills the window, cropping the overflow,
	// centred. The flat base sits behind in case the aspect ever leaves a sliver
	// uncovered. Keep BG_NATIVE = the image file's real pixel size.
	const BG_NATIVE = { width: 1740, height: 904 };
	const cover = $derived(
		Math.max(canvas.width / BG_NATIVE.width, canvas.height / BG_NATIVE.height),
	);
</script>

<Rectangle {...canvas} backgroundColor={0x05060f} zIndex={-4} />
<Sprite
	key="officeBackground"
	x={canvas.width / 2}
	y={canvas.height / 2}
	anchor={0.5}
	width={BG_NATIVE.width * cover}
	height={BG_NATIVE.height * cover}
	zIndex={-3}
/>
