<script lang="ts">
	import { Graphics, SpineProvider, type GraphicsProps } from 'pixi-svelte';
	import { Tween } from 'svelte/motion';

	import { getContext } from '../game/context';
	import { stateGame } from '../game/stateGame.svelte';
	import { toPixel } from '../game/boardGeometry';
	import type { Vec2 } from '../game/types';
	import {
		DISC_SIZES,
		DISC_PLATE_NATIVE,
		DISC_COLOR_CYCLE,
		ZONE_THICKNESS,
	} from '../game/constants';
	import DiscAnimations from './DiscAnimations.svelte';

	// One DVD (logo, spine rig). Motion between booked contact points is
	// straight-line at the handler-computed duration: the book handlers OWN the
	// pacing (they broadcast discMove with `duration` and wait it out), this
	// component only animates — it is never awaited, so a rendering hiccup can
	// never desync scoring from motion. dvdIndex 0 spawns at the reveal's
	// discStart on boardReset; split children mount mid-round with the split
	// contact point as `spawn`.
	let { dvdIndex, spawn }: { dvdIndex: number; spawn: Vec2 | null } = $props();
	const context = getContext();

	// Render the plate (native DISC_PLATE_NATIVE.width) at DISC_SIZES.width.
	const scale = DISC_SIZES.width / DISC_PLATE_NATIVE.width;
	// Bounce on the disc's EDGE, not its centre.
	const halfW = DISC_SIZES.width / 2;
	const halfH = DISC_SIZES.height / 2;
	const EPS = 1e-4;

	// Booked contact points sit exactly on a wall (one coord is 0 or 1; both at
	// a corner). Push the disc centre inward by the tile band thickness PLUS
	// its half-extent so the plate's edge strikes the tile's inner face — the
	// disc bounces off the tiles, never off the TV screen frame behind them.
	// Impact FX (HitFx) still fire on the struck tile.
	const insetW = ZONE_THICKNESS + halfW;
	const insetH = ZONE_THICKNESS + halfH;
	const contactPixel = (p: { x: number; y: number }) => {
		const raw = toPixel(p);
		return {
			x: raw.x + (p.x <= EPS ? insetW : p.x >= 1 - EPS ? -insetW : 0),
			y: raw.y + (p.y <= EPS ? insetH : p.y >= 1 - EPS ? -insetH : 0),
		};
	};

	// Split children spawn visible at their split point; disc 0 waits for
	// boardReset (its booked interior start).
	const spawnPixel = spawn ? contactPixel(spawn) : null;
	let visible = $state(spawnPixel !== null);
	const x = new Tween(spawnPixel?.x ?? 0, { duration: 0 });
	const y = new Tween(spawnPixel?.y ?? 0, { duration: 0 });

	// Phosphor glow trailing the disc. Its colour mirrors the plate tint via a
	// PARALLEL counter fed by the same contact events (the rig's own cycle in
	// DiscAnimations stays untouched); both reset per round — this one on
	// boardReset, the rig's by its remount — so they stay in lockstep.
	let colorIndex = $state(0);
	const glowColor = $derived(DISC_COLOR_CYCLE[colorIndex % DISC_COLOR_CYCLE.length]);
	// ~radial gradient: concentric circles, alpha compounding to ~0.14 centre.
	const GLOW_RADIUS = 170;
	const drawGlow: GraphicsProps['draw'] = $derived.by(() => {
		const color = glowColor;
		return (g) => {
			for (let i = 6; i >= 1; i--) {
				g.circle(0, 0, (GLOW_RADIUS * i) / 6);
				g.fill({ color, alpha: 0.024 });
			}
		};
	});

	// Mid-round skip: snap any in-flight slide to its end (the handlers stop
	// waiting on their own — pacing is theirs, this is just the visual snap).
	let targetX = 0;
	let targetY = 0;
	$effect(() => {
		if (stateGame.skip && visible) {
			x.set(targetX, { duration: 0 });
			y.set(targetY, { duration: 0 });
		}
	});

	const placeAt = (px: number, py: number) => {
		x.set(px, { duration: 0 });
		y.set(py, { duration: 0 });
	};

	const reset = () => {
		visible = false;
		colorIndex = 0;
		// Disc 0 has a booked (interior) start; children never see boardReset
		// (they mount mid-round and unmount at settle).
		if (dvdIndex === 0 && stateGame.discStart) {
			const p = toPixel(stateGame.discStart);
			placeAt(p.x, p.y);
			visible = true;
		}
	};

	context.eventEmitter.subscribeOnMount({
		boardReset: () => reset(),
		discBounce: (emitterEvent) => {
			if (emitterEvent.dvdIndex === dvdIndex) colorIndex += 1;
		},
		discCorner: (emitterEvent) => {
			if (emitterEvent.dvdIndex === dvdIndex) colorIndex += 1;
		},
		discMove: (emitterEvent) => {
			if (emitterEvent.dvdIndex !== dvdIndex) return;
			const target = contactPixel(emitterEvent.position);
			targetX = target.x;
			targetY = target.y;
			if (!visible || stateGame.skip || emitterEvent.duration <= 0) {
				visible = true;
				placeAt(target.x, target.y);
				return;
			}
			x.set(target.x, { duration: emitterEvent.duration });
			y.set(target.y, { duration: emitterEvent.duration });
		},
		// Round resolved (finalWin): the disc leaves the board. It reappears on the
		// next round's boardReset (which remounts the rig, replaying reveal→idle).
		roundEnd: () => {
			visible = false;
		},
	});
</script>

{#if visible}
	<Graphics x={x.current} y={y.current} draw={drawGlow} />
	<SpineProvider key="dvd" x={x.current} y={y.current} {scale}>
		<DiscAnimations {dvdIndex} />
	</SpineProvider>
{/if}
