<script lang="ts">
	import { Container, Text } from 'pixi-svelte';
	import { Tween } from 'svelte/motion';
	import { backOut } from 'svelte/easing';

	import { getContext } from '../game/context';
	import { stateGame } from '../game/stateGame.svelte';
	import { fmtZoneVal, hitVisualZone } from '../game/boardGeometry';
	import { BOARD_SIZES } from '../game/constants';

	// Centre-screen CRT readout, drawn UNDER the disc (see TvScene render order):
	// the last struck tile (LAST HIT) above the round's running multiplier
	// (TOTAL). TOTAL binds stateGame.runningTotal — the book-driven running
	// points — so it matches what the bounce/corner events actually scored.
	const context = getContext();

	const MUTED = 0x96a5c8;
	const CX = BOARD_SIZES.width / 2;
	const CY = BOARD_SIZES.height / 2;

	let lastHit = $state<{ text: string; color: number } | undefined>(undefined);
	let mineHit = $state(false);

	// Reflow-pop equivalents: snap the scale up, spring back (backOut ≈ the
	// spec's cubic-bezier(0.34, 1.56, 0.64, 1)). Skipped rounds flush values
	// without the pop, like the rest of the FX.
	const hitScale = new Tween(1, { duration: 0 });
	const totalScale = new Tween(1, { duration: 0 });
	const pop = (tween: Tween<number>, from: number) => {
		if (stateGame.skip) return;
		tween.set(from, { duration: 0 });
		tween.set(1, { duration: 320, easing: backOut });
	};

	// Pop TOTAL whenever the running points advance (settle resets to 0 —
	// don't pop on that).
	let previousTotal = 0;
	$effect(() => {
		const total = stateGame.runningTotal;
		if (total !== previousTotal && total > 0) pop(totalScale, 1.15);
		previousTotal = total;
	});

	context.eventEmitter.subscribeOnMount({
		boardReset: () => {
			lastHit = undefined;
			mineHit = false;
		},
		discBounce: (emitterEvent) => {
			// Same position-matching as HitFx: the tile the disc is actually over.
			const hit = hitVisualZone(stateGame.zones, emitterEvent.position);
			if (!hit) return;
			if (hit.isDead) {
				lastHit = { text: 'MINE', color: 0xff5a5a };
				mineHit = true;
			} else if (hit.isGlow) {
				lastHit = { text: 'SPLIT', color: 0xb15cff };
			} else if (hit.value > 0) {
				lastHit = { text: `${fmtZoneVal(hit.value)}x`, color: 0x6dff8a };
			} else {
				return;
			}
			pop(hitScale, 1.28);
		},
		discCorner: () => {
			lastHit = { text: '★ CORNER', color: 0xffb84d };
			pop(hitScale, 1.28);
		},
	});

	const totalColor = $derived(mineHit ? 0xff5a5a : 0xffe14d);
	const totalIdle = $derived(!mineHit && stateGame.runningTotal <= 0);
</script>

<Container x={CX} y={CY}>
	<Text
		anchor={0.5}
		y={-96}
		text="LAST HIT"
		alpha={0.5}
		style={{
			fontFamily: 'proxima-nova',
			fontSize: 18,
			fontWeight: '700',
			letterSpacing: 6,
			fill: MUTED,
		}}
	/>
	<Text
		anchor={0.5}
		y={-38}
		scale={hitScale.current}
		text={lastHit?.text ?? '—'}
		alpha={lastHit ? 1 : 0.35}
		style={{
			fontFamily: 'monospace',
			fontSize: 84,
			fontWeight: '800',
			fill: lastHit?.color ?? MUTED,
			...(lastHit && {
				dropShadow: { distance: 0, blur: 22, color: lastHit.color, alpha: 0.9, angle: 0 },
			}),
		}}
	/>
	<Text
		anchor={0.5}
		y={40}
		text="TOTAL"
		alpha={0.5}
		style={{
			fontFamily: 'proxima-nova',
			fontSize: 17,
			fontWeight: '700',
			letterSpacing: 5,
			fill: MUTED,
		}}
	/>
	<Text
		anchor={0.5}
		y={82}
		scale={totalScale.current}
		text={`${fmtZoneVal(stateGame.runningTotal)}x`}
		alpha={totalIdle ? 0.35 : 1}
		style={{
			fontFamily: 'monospace',
			fontSize: 44,
			fontWeight: '800',
			fill: totalIdle ? MUTED : totalColor,
			...(!totalIdle && {
				dropShadow: { distance: 0, blur: 14, color: totalColor, alpha: 0.5, angle: 0 },
			}),
		}}
	/>
</Container>
