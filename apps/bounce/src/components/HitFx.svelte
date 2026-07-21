<script lang="ts">
	import { SpineProvider } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { stateGame } from '../game/stateGame.svelte';
	import { toPixel, fmtZoneVal } from '../game/boardGeometry';
	import { BOARD_SIZES, POP_SCALE } from '../game/constants';
	import type { Vec2 } from '../game/types';
	import PopAnimation from './PopAnimation.svelte';

	// One-shot FX layer above the discs: each qualifying event spawns short
	// spine clips at the booked contact point and unmounts them on complete.
	// Fire-and-forget — never extends the awaited event.
	type Pop = {
		id: number;
		key: string;
		animationName: string;
		x: number;
		y: number;
		scale: number;
		text?: string;
	};

	const context = getContext();
	let pops = $state<Pop[]>([]);
	let nextId = 0;

	// The value/BOOM bubbles run at half the FX scale (design: they crowded the
	// board at full POP_SCALE); the mitosis coupon and explosion keep it.
	const popScale = (key: string) =>
		key === 'multPop' || key === 'boomPop' ? POP_SCALE / 2 : POP_SCALE;

	// Text pops are nudged inside the board so a wall contact doesn't clip the
	// bubble at the screen mask (half a bubble at POP_SCALE is ~150x60; margins
	// shrink with the pop's scale). The explosion stays on the exact contact
	// point — its burst reads fine bleeding over.
	const spawn = (key: string, animationName: string, position: Vec2, text?: string) => {
		const p = toPixel(position);
		const scale = popScale(key);
		const f = scale / POP_SCALE;
		const x =
			key === 'explosion'
				? p.x
				: Math.min(Math.max(p.x, 155 * f), BOARD_SIZES.width - 155 * f);
		// extra top headroom: the pop clip floats the bubble ~50px upward
		const y =
			key === 'explosion'
				? p.y
				: Math.min(Math.max(p.y, 115 * f), BOARD_SIZES.height - 65 * f);
		pops.push({ id: nextId++, key, animationName, x, y, scale, text });
	};
	const remove = (id: number) => {
		pops = pops.filter((pop) => pop.id !== id);
	};

	context.eventEmitter.subscribeOnMount({
		boardReset: () => {
			pops = [];
		},
		discBounce: (emitterEvent) => {
			// A mid-round SPIN (skip) cuts straight to the result — don't spawn the
			// rest of the bounce FX.
			if (stateGame.skip) return;
			if (emitterEvent.lethal) {
				// post-immunity mine: the DVD dies — BOOM pop + explosion
				spawn('explosion', 'explode', emitterEvent.position);
				spawn('boomPop', 'pop', emitterEvent.position);
			} else if (emitterEvent.value > 0) {
				// gem hit (incl. an immune mine hit, which pays a random value)
				spawn('multPop', 'pop', emitterEvent.position, `+${fmtZoneVal(emitterEvent.value)}x`);
			}
			// dead tiles, star grazes and the mythosis strike itself pay nothing;
			// the split gets its own FX on discSplit below.
		},
		// Rules: mythosis — the parent bursts into two children at the cell.
		discSplit: (emitterEvent) => {
			if (stateGame.skip) return;
			spawn('mitosisPop', 'pop', emitterEvent.position);
		},
		// Rules: the corner multiplier shows as a popup at the struck corner —
		// the disc has genuinely travelled into it (booked corner position).
		discCorner: (emitterEvent) => {
			if (stateGame.skip) return;
			spawn('multPop', 'pop', emitterEvent.position, `×${fmtZoneVal(emitterEvent.cornerMultiplier)}`);
		},
		// Rules: a corner hit can chain an extra DVD round — announce it.
		discChain: () => {
			if (stateGame.skip) return;
			spawn('multPop', 'pop', { x: 0.5, y: 0.35 }, 'CHAIN!');
		},
	});
</script>

{#each pops as pop (pop.id)}
	<SpineProvider key={pop.key} x={pop.x} y={pop.y} scale={pop.scale}>
		<PopAnimation
			animationName={pop.animationName}
			text={pop.text}
			oncomplete={() => remove(pop.id)}
		/>
	</SpineProvider>
{/each}
