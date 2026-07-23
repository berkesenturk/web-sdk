<script lang="ts">
	import { Text, Rectangle, SpineProvider, SpineSlot } from 'pixi-svelte';
	import { Button } from 'components-pixi';
	import { stateBet, stateBetDerived, stateConfig, stateModal, stateSound } from 'state-shared';

	import { getContext } from '../game/context';
	import { stateGame, stateGameDerived } from '../game/stateGame.svelte';
	import { TV_RIG_SIZES } from '../game/constants';
	import TvAnimations from './TvAnimations.svelte';

	const context = getContext();

	// The cabinet bakes the "KREDİ"/"BAHİS" labels next to two empty dark LCD
	// boxes (the `readout` attachment, 88x21 rig px) — live text renders straight
	// onto them, no cover needed. KREDİ = the player's credit (balance); it rises
	// by the win / drops by the bet each round. Slot objects follow the slot's
	// bone, so the counter-pop (keyed on the kredi bone) pops the credit when a
	// win lands. BAHİS = the stake actually taken this round, i.e. the bet amount
	// times the mode's cost multiplier (×1/×5/×25/×100) — same value the SDK's
	// LabelBet shows. Showing the raw betAmount here would contradict both KREDİ
	// (which is debited by the cost) and EARNED (= TOTAL X × stake).
	const credit = $derived(stateBet.balanceAmount.toFixed(2));
	const betAmount = $derived(stateBetDerived.betCost().toFixed(2));

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
	// While a round is playing the dial shows a STOP icon (red rounded square,
	// matching the SDK bet button's stop state). isPlaying, not !isIdle, so the
	// icon doesn't show during the initial rendering state.
	const roundRunning = $derived(context.stateXstateDerived.isPlaying());

	const spin = () => {
		if (!idle()) {
			stateGameDerived.requestSkip();
			return;
		}
		if (!stateBetDerived.isBetCostAvailable()) return;
		context.eventEmitter.broadcast({ type: 'soundPressBet' });
		if (stateBetDerived.activeBetMode()?.type === 'buy') stateBet.activeBetModeKey = 'BASE';
		context.eventEmitter.broadcast({ type: 'bet' });
	};

	const cabinetButtons = [
		{
			// SES / BİLGİ hit+hover areas match the baked pills exactly (31x12.5
			// measured from the cabinet art), same as the live MENÜ pill above them.
			x: 39.5, y: 569, width: 31, height: 12.5, // SES pill
			onpress: () => {
				pressSound();
				stateSound.volumeValueMaster = stateSound.volumeValueMaster === 0 ? 50 : 0;
			},
		},
		{
			x: 39.5, y: 586, width: 31, height: 12.5, // BİLGİ pill
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
			// dial = SPIN (always clickable). The knob art is bone-scaled 1.2x (see
			// TvAnimations); 66 not 71 here so the grown hit box doesn't eat further
			// into the BAHİS knobs' hit areas (the visible knob circle is ~49 px).
			x: 384, y: 564, width: 66, height: 66,
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

{#if roundRunning}
	<!-- STOP affordance on the SPIN dial: a knob-face-coloured disc hides the
	     baked spin-arrow glyph, then the red rounded square draws over it. Both
	     are non-interactive, so the dial's hit area beneath still takes the
	     mid-round press (= skip to result). -->
	<!-- Not at the hit area's 384/564: the knob is drawn ~1px up-left of centre
	     in its texture, and the 1.2x bone scale magnifies that optical offset
	     (measured from the rim circle). Sizes are the 1.2x of the original
	     34/24 so the icon keeps its proportion to the enlarged knob. -->
	<Rectangle
		x={382.8}
		y={562.3}
		anchor={0.5}
		width={41}
		height={41}
		borderRadius={20.5}
		backgroundColor={0xacb984}
	/>
	<Rectangle
		x={382.8}
		y={562.3}
		anchor={0.5}
		width={23}
		height={23}
		borderRadius={5}
		backgroundAlpha={0}
		borderWidth={3}
		borderColor={0xf2606c}
	/>
{/if}

{#each cabinetButtons as button (button)}
	<Button
		x={button.x}
		y={button.y}
		anchor={0.5}
		sizes={{ width: button.width, height: button.height }}
		disabled={button.disabled?.()}
		onpress={button.onpress}
	>
		{#snippet children({ hovered })}
			<!-- Invisible hit area that lightens on hover for feedback (the button
			     art itself is baked into the cabinet). -->
			<Rectangle
				width={button.width}
				height={button.height}
				backgroundColor={0xffffff}
				backgroundAlpha={hovered ? 0.18 : 0}
				borderRadius={Math.min(button.width, button.height) / 2}
			/>
		{/snippet}
	</Button>
{/each}
