<script lang="ts">
	import { SpineProvider } from 'pixi-svelte';
	import { Tween } from 'svelte/motion';
	import { stateBet } from 'state-shared';

	import { getContext } from '../game/context';
	import { stateGame } from '../game/stateGame.svelte';
	import { toPixel } from '../game/boardGeometry';
	import { DISC_SIZES, DISC_PLATE_NATIVE, DISC_SPEED, DISC_DURATION } from '../game/constants';
	import DiscAnimations from './DiscAnimations.svelte';

	// One disc (DVD logo, spine rig). It only renders/animates when it receives a
	// discMove for its own dvdIndex; motion between booked contact points is
	// straight-line constant speed (the true DVD path), per BOOK_CONTRACT.md. The
	// awaited move paces the book handler, which broadcasts the impact after.
	let { dvdIndex }: { dvdIndex: number } = $props();
	const context = getContext();

	// Render the plate (native DISC_PLATE_NATIVE.width) at DISC_SIZES.width.
	const scale = DISC_SIZES.width / DISC_PLATE_NATIVE.width;
	// Bounce on the disc's EDGE, not its centre.
	const halfW = DISC_SIZES.width / 2;
	const halfH = DISC_SIZES.height / 2;
	const EPS = 1e-4;

	let visible = $state(false);
	const x = new Tween(0, { duration: 0 });
	const y = new Tween(0, { duration: 0 });

	// Mid-round skip: snap the in-flight slide to its end and resolve the move that
	// discMove is awaiting. We must resolve it explicitly — interrupting a running
	// Tween.set() with another set() abandons the first set's promise (it never
	// resolves), which would hang the round's awaited event chain.
	let targetX = 0;
	let targetY = 0;
	let onSkip: (() => void) | null = null;
	$effect(() => {
		if (stateGame.skip && onSkip) {
			x.set(targetX, { duration: 0 });
			y.set(targetY, { duration: 0 });
			onSkip();
			onSkip = null;
		}
	});

	const placeAt = (px: number, py: number) =>
		Promise.all([x.set(px, { duration: 0 }), y.set(py, { duration: 0 })]);

	// Booked contact points sit exactly on a wall (one coord is 0 or 1). Push the
	// disc centre inward by its half-extent so the plate's edge — not its middle —
	// touches the struck wall. Impact FX (HitFx) still fire at the true contact
	// point on the wall, so the edge meets the wall and the burst lands there.
	const contactPixel = (p: { x: number; y: number }) => {
		const raw = toPixel(p);
		return {
			x: raw.x + (p.x <= EPS ? halfW : p.x >= 1 - EPS ? -halfW : 0),
			y: raw.y + (p.y <= EPS ? halfH : p.y >= 1 - EPS ? -halfH : 0),
		};
	};

	const reset = () => {
		visible = false;
		// Disc 0 has a booked (interior) start; later discs (sequential roulette)
		// appear on their first bounce.
		if (dvdIndex === 0 && stateGame.discStart) {
			const p = toPixel(stateGame.discStart);
			placeAt(p.x, p.y);
			visible = true;
		}
	};

	context.eventEmitter.subscribeOnMount({
		boardReset: () => reset(),
		discMove: async (emitterEvent) => {
			if (emitterEvent.dvdIndex !== dvdIndex) return;
			const target = contactPixel(emitterEvent.position);
			targetX = target.x;
			targetY = target.y;
			// Already skipping (or first placement) → jump instantly.
			if (!visible || stateGame.skip) {
				visible = true;
				await placeAt(target.x, target.y);
				return;
			}
			const dist = Math.hypot(target.x - x.current, target.y - y.current);
			const factor = stateBet.isTurbo ? 0.35 : 1;
			const duration =
				Math.min(DISC_DURATION.max, Math.max(DISC_DURATION.min, dist / DISC_SPEED)) * factor;
			const move = Promise.all([x.set(target.x, { duration }), y.set(target.y, { duration })]);
			// Resolve as soon as EITHER the slide finishes OR a skip snaps it (above).
			const skipped = new Promise<void>((resolve) => (onSkip = resolve));
			await Promise.race([move, skipped]);
			onSkip = null;
		},
		// Round resolved (finalWin): the disc leaves the board. It reappears on the
		// next round's boardReset (which remounts the rig, replaying reveal→idle).
		roundEnd: () => {
			visible = false;
		},
	});
</script>

{#if visible}
	<SpineProvider key="dvd" x={x.current} y={y.current} {scale}>
		<DiscAnimations {dvdIndex} />
	</SpineProvider>
{/if}
