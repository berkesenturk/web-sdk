<script lang="ts">
	import { SpineProvider } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { stateGame } from '../game/stateGame.svelte';
	import { toPixel, fmtZoneVal, hitVisualZone } from '../game/boardGeometry';
	import { BOARD_SIZES, POP_SCALE } from '../game/constants';
	import type { Vec2 } from '../game/types';
	import PopAnimation from './PopAnimation.svelte';

	// One-shot FX layer above the discs: each qualifying bounce spawns short
	// spine clips at the booked contact point and unmounts them on complete.
	// Fire-and-forget — never extends the awaited bounce.
	type Pop = { id: number; key: string; animationName: string; x: number; y: number; text?: string };

	const context = getContext();
	let pops = $state<Pop[]>([]);
	let nextId = 0;

	// Text pops are nudged inside the board so a wall contact doesn't clip the
	// bubble at the screen mask (half a scaled bubble is ~150x60). The explosion
	// stays on the exact contact point — its burst reads fine bleeding over.
	const spawn = (key: string, animationName: string, position: Vec2, text?: string) => {
		const p = toPixel(position);
		const x = key === 'explosion' ? p.x : Math.min(Math.max(p.x, 155), BOARD_SIZES.width - 155);
		// extra top headroom: the pop clip floats the bubble ~50px upward
		const y = key === 'explosion' ? p.y : Math.min(Math.max(p.y, 115), BOARD_SIZES.height - 65);
		pops.push({ id: nextId++, key, animationName, x, y, text });
	};
	const remove = (id: number) => {
		pops = pops.filter((pop) => pop.id !== id);
	};

	context.eventEmitter.subscribeOnMount({
		boardReset: () => {
			pops = [];
		},
		discBounce: (emitterEvent) => {
			// Match the FX to the tile the disc is actually OVER (by contact
			// position), so the pop kind/value agrees with the tile that flashes.
			const hit = hitVisualZone(stateGame.zones, emitterEvent.position);
			if (!hit) return;
			if (hit.isDead) {
				// mine: the tile's hit anim is joined by the BOOM pop + explosion
				spawn('explosion', 'explode', emitterEvent.position);
				spawn('boomPop', 'pop', emitterEvent.position);
			} else if (hit.isGlow) {
				// mitosis cell split hands out its ×2 coupon
				spawn('mitosisPop', 'pop', emitterEvent.position);
			} else if (hit.value > 0) {
				// gem: pop the value shown on the tile the disc hit
				spawn('multPop', 'pop', emitterEvent.position, `+${fmtZoneVal(hit.value)}x`);
			}
		},
	});
</script>

{#each pops as pop (pop.id)}
	<SpineProvider key={pop.key} x={pop.x} y={pop.y} scale={POP_SCALE}>
		<PopAnimation
			animationName={pop.animationName}
			text={pop.text}
			oncomplete={() => remove(pop.id)}
		/>
	</SpineProvider>
{/each}
