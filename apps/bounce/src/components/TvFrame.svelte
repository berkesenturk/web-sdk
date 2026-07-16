<script lang="ts">
	import { Text, Rectangle, SpineProvider, SpineSlot } from 'pixi-svelte';
	import { Button } from 'components-pixi';
	import { stateBet, stateBetDerived, stateConfig, stateModal, stateSound } from 'state-shared';

	import { getContext } from '../game/context';
	import { stateGame } from '../game/stateGame.svelte';
	import { TV_RIG_SIZES } from '../game/constants';
	import TvAnimations from './TvAnimations.svelte';

	const context = getContext();

	// The cabinet bakes the "KREDİ"/"BAHİS" labels next to two empty dark LCD
	// boxes (the `readout` attachment, 88x21 rig px) — live text renders straight
	// onto them, no cover needed. KREDİ = the player's credit (balance); it rises
	// by the win / drops by the bet each round. Slot objects follow the slot's
	// bone, so the counter-pop (keyed on the kredi bone) pops the credit when a
	// win lands. BAHİS = the current bet.
	const credit = $derived(stateBet.balanceAmount.toFixed(2));
	const betAmount = $derived(stateBet.betAmount.toFixed(2));

	// The cabinet also bakes its control-panel buttons (SES/BİLGİ pills, the
	// BAHİS −/+ knobs, the SPIN dial, the OTO switch). Invisible hit areas at
	// their measured rig positions wire them to the same actions as the overlay
	// UI buttons. These live in the TvScene layer — i.e. BEHIND the SDK's UI — so
	// they never steal clicks from the SDK buttons drawn over the panel; where the
	// two overlap (TURBO sits on the dial's lower-left), the SDK button wins. The
	// MENÜ pill lives in TvMenu.svelte (its own layer above the UI).
	const pressSound = () => context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
	const sortedBets = () => [...stateConfig.betAmountOptions].sort((a, b) => a - b);

	// The SPIN dial stays clickable the whole time. Idle → start a round; mid-round
	// → flip stateGame.skip on, which fast-forwards the rest of the animation to
	// the result (see Disc/ScreenHud/Board). Deliberately NOT the SDK bet button's
	// contract: its mid-round press broadcasts `stopButtonClick`, which ButtonTurbo
	// turns into turbo-for-this-round (a gradual speed-up) — not the clean jump-to-
	// end the cabinet wants. The BAHİS knobs / OTO still lock mid-round.
	const idle = () => context.stateXstateDerived.isIdle();

	const spin = () => {
		if (!idle()) {
			stateGame.skip = true;
			return;
		}
		if (!stateBetDerived.isBetCostAvailable()) return;
		context.eventEmitter.broadcast({ type: 'soundPressBet' });
		if (stateBetDerived.activeBetMode()?.type === 'buy') stateBet.activeBetModeKey = 'BASE';
		context.eventEmitter.broadcast({ type: 'bet' });
	};

	const cabinetButtons = [
		{
			x: 39, y: 571, width: 44, height: 16, // SES pill
			onpress: () => {
				pressSound();
				stateSound.volumeValueMaster = stateSound.volumeValueMaster === 0 ? 50 : 0;
			},
		},
		{
			x: 39, y: 588, width: 44, height: 16, // BİLGİ pill
			onpress: () => { pressSound(); stateModal.modal = { name: 'gameRules' }; },
		},
		{
			x: 342, y: 562, width: 32, height: 32, // knobL = BAHİS −
			disabled: () => !idle(),
			onpress: () => {
				pressSound();
				const options = sortedBets();
				const nextSmaller = [...options].reverse().find((o) => o < stateBet.betAmount);
				stateBetDerived.setBetAmount(nextSmaller ?? options[0]);
			},
		},
		{
			x: 426, y: 562, width: 32, height: 32, // knobR = BAHİS +
			disabled: () => !idle(),
			onpress: () => {
				pressSound();
				const options = sortedBets();
				const nextBigger = options.find((o) => o > stateBet.betAmount);
				stateBetDerived.setBetAmount(nextBigger ?? options[options.length - 1]);
			},
		},
		{
			x: 384, y: 564, width: 59, height: 59, // dial = SPIN (always clickable)
			onpress: spin,
		},
		{
			x: 452, y: 568, width: 14, height: 22, // OTO switch = auto spin
			disabled: () => !idle() && !stateBetDerived.hasAutoBetCounter(),
			onpress: () => {
				pressSound();
				if (stateBetDerived.hasAutoBetCounter()) stateBet.autoSpinsCounter = 0;
				else stateModal.modal = { name: 'autoSpin' };
			},
		},
	];
</script>

<!-- The rig's root is at the cabinet center; shift by half the rig size so the
     parent container keeps addressing the TV as [0..width]x[0..height]. -->
<SpineProvider key="tv" x={TV_RIG_SIZES.width / 2} y={TV_RIG_SIZES.height / 2}>
	<TvAnimations />

	<SpineSlot slotName="kredi">
		<Text
			anchor={0.5}
			scale={0.26}
			text={credit}
			style={{
				fontFamily: 'proxima-nova',
				fontSize: 48,
				fontWeight: '800',
				fill: 0xffa64d,
				dropShadow: { color: 0xff9d2e, blur: 8, distance: 0, alpha: 0.9 },
			}}
		/>
	</SpineSlot>

	<SpineSlot slotName="bahis">
		<Text
			anchor={0.5}
			scale={0.3}
			text={betAmount}
			style={{
				fontFamily: 'proxima-nova',
				fontSize: 48,
				fontWeight: '800',
				fill: 0x7fe0ff,
				dropShadow: { color: 0x5ac8f0, blur: 8, distance: 0, alpha: 0.9 },
			}}
		/>
	</SpineSlot>
</SpineProvider>

{#each cabinetButtons as button (button)}
	<Button
		x={button.x}
		y={button.y}
		anchor={0.5}
		sizes={{ width: button.width, height: button.height }}
		disabled={button.disabled?.()}
		onpress={button.onpress}
	>
		{#snippet children()}
			<Rectangle width={button.width} height={button.height} alpha={0} />
		{/snippet}
	</Button>
{/each}
