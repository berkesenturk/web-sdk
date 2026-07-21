<script lang="ts">
	import { Container, Text } from 'pixi-svelte';
	import { Tween } from 'svelte/motion';
	import { backOut } from 'svelte/easing';
	import { stateBet } from 'state-shared';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';

	import { getContext } from '../game/context';
	import { stateGame } from '../game/stateGame.svelte';
	import { BOARD_SIZES } from '../game/constants';

	// Centre-screen CRT readout, drawn UNDER the disc (see TvScene render order):
	// the round's money win (EARNED, the hero, screen centre, revealed at round
	// end) over a bottom row pairing the running multiplier (TOTAL X, left) with
	// the last struck tile (LAST HIT, right).
	// TOTAL X / LAST HIT show the BOOKED values (event value / runningTotal =
	// zoneSum x cornerProduct, always two decimals). EARNED converts
	// winBookEventAmount exactly like the SDK's LabelWin, so it always agrees
	// with the WIN meter.
	const context = getContext();

	const MUTED = 0x96a5c8;
	const CX = BOARD_SIZES.width / 2;
	const CY = BOARD_SIZES.height / 2;

	let lastHit = $state<{ text: string; color: number } | undefined>(undefined);
	let mineHit = $state(false);
	let earned = $state<{ text: string; positive: boolean } | undefined>(undefined);

	// Reflow-pop equivalents: snap the scale up, spring back (backOut ≈ the
	// spec's cubic-bezier(0.34, 1.56, 0.64, 1)). Skipped rounds flush values
	// without the pop, like the rest of the FX.
	const hitScale = new Tween(1, { duration: 0 });
	const totalScale = new Tween(1, { duration: 0 });
	const earnedScale = new Tween(1, { duration: 0 });
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
			earned = undefined;
		},
		discBounce: (emitterEvent) => {
			if (emitterEvent.lethal) {
				lastHit = { text: 'MINE', color: 0xff5a5a };
				mineHit = true;
			} else if (emitterEvent.tileKind === 'mythosis' && !emitterEvent.splitSuppressed) {
				lastHit = { text: 'MYTHOSIS', color: 0xb15cff };
			} else if (emitterEvent.tileKind === 'dead') {
				lastHit = { text: '0.00x', color: 0x9aa3b5 };
			} else if (emitterEvent.value > 0) {
				lastHit = { text: `${emitterEvent.value.toFixed(2)}x`, color: 0x6dff8a };
			} else {
				return;
			}
			pop(hitScale, 1.28);
		},
		discCorner: () => {
			lastHit = { text: '★ CORNER', color: 0xffb84d };
			pop(hitScale, 1.28);
		},
		// Round resolved: reveal the money win with a zoom-in (backOut overshoots
		// past 1 and springs back — the in/out). setTotalWin has already landed in
		// winBookEventAmount by the time finalWin broadcasts this. NOT gated on
		// skip: skip jumps to the result, and EARNED is the result.
		roundEnd: () => {
			earned = {
				text: bookEventAmountToCurrencyString(stateBet.winBookEventAmount),
				positive: stateBet.winBookEventAmount > 0,
			};
			earnedScale.set(0, { duration: 0 });
			earnedScale.set(1, { duration: 450, easing: backOut });
		},
	});

	const totalColor = 0x6dff8a; // always green, even on a mine death
	const totalIdle = $derived(!mineHit && stateGame.runningTotal <= 0);
</script>

<Container x={CX} y={CY}>
	<Text
		anchor={0.5}
		y={-110}
		text="EARNED"
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
		y={-50}
		scale={earnedScale.current}
		text={earned?.text ?? '—'}
		alpha={earned ? 1 : 0.35}
		style={{
			fontFamily: 'monospace',
			fontSize: 84,
			fontWeight: '800',
			fill: earned ? (earned.positive ? 0xffe14d : 0xff5a5a) : MUTED,
			...(earned && {
				dropShadow: {
					distance: 0,
					blur: 22,
					color: earned.positive ? 0xffe14d : 0xff5a5a,
					alpha: 0.9,
					angle: 0,
				},
			}),
		}}
	/>
	<Text
		anchor={0.5}
		x={-150}
		y={44}
		text="TOTAL X"
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
		x={-150}
		y={86}
		scale={totalScale.current}
		text={`${stateGame.runningTotal.toFixed(2)}x`}
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
	<Text
		anchor={0.5}
		x={150}
		y={44}
		text="LAST HIT"
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
		x={150}
		y={86}
		scale={hitScale.current}
		text={lastHit?.text ?? '—'}
		alpha={lastHit ? 1 : 0.35}
		style={{
			fontFamily: 'monospace',
			fontSize: 44,
			fontWeight: '800',
			fill: lastHit?.color ?? MUTED,
			...(lastHit && {
				dropShadow: { distance: 0, blur: 14, color: lastHit.color, alpha: 0.9, angle: 0 },
			}),
		}}
	/>
</Container>
