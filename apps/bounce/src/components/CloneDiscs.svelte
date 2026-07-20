<script lang="ts">
	import { Graphics, SpineProvider, type GraphicsProps } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { stateGame } from '../game/stateGame.svelte';
	import { toPixel, hitVisualZone, isVisualMitosis } from '../game/boardGeometry';
	import {
		BOARD_SIZES,
		ZONE_THICKNESS,
		DISC_SIZES,
		DISC_PLATE_NATIVE,
		DISC_SPEED,
		DISC_COLOR_CYCLE,
	} from '../game/constants';
	import CloneDiscAnimations from './CloneDiscAnimations.svelte';

	// Decorative clone DVDs for the MYTHOSIS visual modes. Every REAL (booked)
	// hit on a visually-swapped mitosis tile is a binary split: exactly one
	// clone spawns at the contact and leaves opposite to the hitter (= its
	// incoming direction negated, the mirror of its outgoing direction across
	// the wall normal) — one hit, two DVDs. Clones fly straight at DISC_SPEED,
	// reflect off the same edge-inset bounds as the real disc, and squash +
	// tint-step per contact, but never split or score themselves (visuals
	// only, per spec); the fleet grows only through real hits. Clones vanish
	// on skip / round end. MAX_CLONES is a safety ceiling.
	const context = getContext();

	type Clone = { id: number; x: number; y: number; vx: number; vy: number; bounces: number };

	const rigScale = DISC_SIZES.width / DISC_PLATE_NATIVE.width;
	const halfW = DISC_SIZES.width / 2;
	const halfH = DISC_SIZES.height / 2;
	const t = ZONE_THICKNESS;
	const MIN_X = t + halfW;
	const MAX_X = BOARD_SIZES.width - t - halfW;
	const MIN_Y = t + halfH;
	const MAX_Y = BOARD_SIZES.height - t - halfH;
	const MAX_CLONES = 16;
	const MAX_STEP_MS = 50; // clamp jank frames so clones can't tunnel a wall

	let clones = $state<Clone[]>([]);
	let nextId = 0;

	// Real discs' last two contact pixels, to derive incoming direction at a hit.
	const lastPos = new Map<number, { x: number; y: number }>();
	const prevPos = new Map<number, { x: number; y: number }>();

	const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

	const spawn = (x: number, y: number, dirX: number, dirY: number) => {
		if (clones.length >= MAX_CLONES) return;
		const len = Math.hypot(dirX, dirY);
		// Degenerate direction (first bounce straight from spawn overlap): pick a
		// diagonal so the clone always leaves the wall.
		const [ux, uy] = len > 1e-3 ? [dirX / len, dirY / len] : [Math.SQRT1_2, -Math.SQRT1_2];
		clones.push({
			id: nextId++,
			x: clamp(x, MIN_X, MAX_X),
			y: clamp(y, MIN_Y, MAX_Y),
			vx: ux * DISC_SPEED,
			vy: uy * DISC_SPEED,
			bounces: 0,
		});
	};

	// Clone wall contacts only squash/tint — they never split. A mythosis hit
	// is a BINARY split (one hit → exactly two DVDs leave the tile), so new
	// clones come only from the real disc's booked hits (discBounce below),
	// where the tile flash + coupon make the cause visible.
	const step = (dtRaw: number) => {
		const dt = Math.min(dtRaw, MAX_STEP_MS);
		for (const clone of clones) {
			clone.x += clone.vx * dt;
			clone.y += clone.vy * dt;
			let struck = false;
			if (clone.x <= MIN_X || clone.x >= MAX_X) {
				clone.x = clamp(clone.x, MIN_X, MAX_X);
				clone.vx = -clone.vx;
				struck = true;
			}
			if (clone.y <= MIN_Y || clone.y >= MAX_Y) {
				clone.y = clamp(clone.y, MIN_Y, MAX_Y);
				clone.vy = -clone.vy;
				struck = true;
			}
			if (struck) clone.bounces += 1;
		}
	};

	// Simulation loop: runs only while clones are alive; skip wipes the fleet
	// (skip jumps to the result — clones are round FX).
	$effect(() => {
		if (clones.length === 0) return;
		if (stateGame.skip) {
			clones = [];
			return;
		}
		let raf = 0;
		let last = performance.now();
		const loop = (now: number) => {
			step(now - last);
			last = now;
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(raf);
	});

	context.eventEmitter.subscribeOnMount({
		boardReset: () => {
			clones = [];
			lastPos.clear();
			prevPos.clear();
			if (stateGame.discStart) lastPos.set(0, toPixel(stateGame.discStart));
		},
		discMove: (emitterEvent) => {
			const at = toPixel(emitterEvent.position);
			const prev = lastPos.get(emitterEvent.dvdIndex);
			if (prev) prevPos.set(emitterEvent.dvdIndex, prev);
			lastPos.set(emitterEvent.dvdIndex, at);
		},
		discBounce: (emitterEvent) => {
			if (stateGame.skip) return;
			const hit = hitVisualZone(stateGame.zones, emitterEvent.position);
			if (!hit || !isVisualMitosis(hit, stateGame.visualMode)) return;
			const at = toPixel(emitterEvent.position);
			const from = prevPos.get(emitterEvent.dvdIndex);
			spawn(at.x, at.y, from ? from.x - at.x : 0, from ? from.y - at.y : 0);
		},
		roundEnd: () => {
			clones = [];
		},
	});

	// Same phosphor glow treatment as the real disc (Disc.svelte), one per clone.
	const GLOW_RADIUS = 170;
	const drawGlow = (color: number): GraphicsProps['draw'] => (g) => {
		for (let i = 6; i >= 1; i--) {
			g.circle(0, 0, (GLOW_RADIUS * i) / 6);
			g.fill({ color, alpha: 0.024 });
		}
	};
</script>

{#each clones as clone (clone.id)}
	<Graphics
		x={clone.x}
		y={clone.y}
		draw={drawGlow(DISC_COLOR_CYCLE[clone.bounces % DISC_COLOR_CYCLE.length])}
	/>
	<SpineProvider key="dvd" x={clone.x} y={clone.y} scale={rigScale}>
		<CloneDiscAnimations bounces={clone.bounces} />
	</SpineProvider>
{/each}
