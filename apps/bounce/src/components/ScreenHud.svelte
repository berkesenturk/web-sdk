<script lang="ts">
	import { Container, Text } from 'pixi-svelte';
	import { waitForTimeout } from 'utils-shared/wait';

	import { stateBet } from 'state-shared';

	import { getContext } from '../game/context';
	import { stateGame } from '../game/stateGame.svelte';
	import { fmtZoneVal } from '../game/boardGeometry';
	import { BOARD_SIZES } from '../game/constants';

	// On-screen (CRT) readout, in board pixel space: the round's payout multiplier
	// as booked (stateBet.winBookEventAmount, set by the setTotalWin book event),
	// NOT the client-side running points — so it matches the win that settles to
	// KREDİ. It's 0 until the win lands near the round's end. The corner popup
	// still flashes the effective multiplier.
	const context = getContext();
	const payoutMultiplier = $derived(stateBet.winBookEventAmount / 100);

	let cornerPopup = $state<string | undefined>(undefined);

	context.eventEmitter.subscribeOnMount({
		boardReset: () => (cornerPopup = undefined),
		discCorner: async (emitterEvent) => {
			cornerPopup = `×${fmtZoneVal(emitterEvent.effectiveMultiplier)}`;
			if (!stateGame.skip) await waitForTimeout(900);
			cornerPopup = undefined;
		},
	});
</script>

<Container x={BOARD_SIZES.width / 2} y={72}>
	<Text
		anchor={{ x: 0.5, y: 0 }}
		text={`${fmtZoneVal(payoutMultiplier)}x`}
		alpha={0.9}
		style={{
			fontFamily: 'proxima-nova',
			fontSize: 40,
			fontWeight: '600',
			fill: 0x9fe8a0,
			align: 'center',
		}}
	/>
</Container>

{#if cornerPopup}
	<Container x={BOARD_SIZES.width / 2} y={BOARD_SIZES.height / 2}>
		<Text
			anchor={0.5}
			text={cornerPopup}
			style={{
				fontFamily: 'proxima-nova',
				fontSize: 110,
				fontWeight: '800',
				fill: 0xff5cc8,
				align: 'center',
			}}
		/>
	</Container>
{/if}
