<script lang="ts">
	import { onMount } from 'svelte';

	import { EnablePixiExtension } from 'components-pixi';
	import { EnableHotkey } from 'components-shared';
	import { App, Container, Text, REM } from 'pixi-svelte';
	import { UiGameName } from 'components-ui-pixi';
	import { GameVersion, Modals } from 'components-ui-html';
	import { stateUi } from 'state-shared';

	import { getContext } from '../game/context';
	import { TV_WIDEN, DESIGN_MODE } from '../game/constants';
	import { tvTransform } from '../game/tvLayout';
	import EnableGameActor from './EnableGameActor.svelte';
	import ResumeBet from './ResumeBet.svelte';
	import Background from './Background.svelte';
	import LoadingScreen from './LoadingScreen.svelte';
	import TvScene from './TvScene.svelte';
	import TvMenu from './TvMenu.svelte';
	import UiReplayBar from './UiReplayBar.svelte';

	const context = getContext();

	// The SDK's UI (BALANCE/WIN/BET boxes) is drawn over the cabinet's bottom
	// panel, which is where the baked MENÜ pill sits. The cabinet menu therefore
	// renders in its own layer AFTER the UI, transformed onto the same rig
	// coordinates as TvScene, so the pill and its dropdown stay visible.
	const tv = $derived(tvTransform(context.stateLayoutDerived.canvasSizes()));

	onMount(() => (context.stateLayout.showLoadingScreen = true));
</script>

<App>
	<EnableHotkey />
	<EnableGameActor />
	<EnablePixiExtension />

	<Background />

	{#if context.stateLayout.showLoadingScreen}
		<LoadingScreen onloaded={() => (context.stateLayout.showLoadingScreen = false)} />
	{:else}
		<ResumeBet />

		<TvScene />

		<!-- Default (demo) play is cabinet-only: the retro TV IS the whole UI
		     (KREDİ credit, BAHİS knobs, SPIN dial, MENÜ/SES/BİLGİ, OTO), so the
		     SDK betting bar is not rendered. Replay still gets the slim SDK row. -->
		{#if stateUi.config.mode === 'replay'}
			<UiReplayBar>
				{#snippet gameName()}
					<UiGameName name="BOUNCE" />
				{/snippet}
				{#snippet logo()}
					<Text
						anchor={{ x: 1, y: 0 }}
						text="BOUNCE"
						style={{
							fontFamily: 'proxima-nova',
							fontSize: REM * 1.5,
							fontWeight: '600',
							lineHeight: REM * 2,
							fill: 0xffffff,
						}}
					/>
				{/snippet}
			</UiReplayBar>
		{/if}

		{#if !DESIGN_MODE}
			<Container x={tv.x} y={tv.y} scale={{ x: tv.scale * TV_WIDEN, y: tv.scale }}>
				<TvMenu />
			</Container>
		{/if}
	{/if}
</App>

<Modals>
	{#snippet version()}
		<GameVersion version="0.0.0" />
	{/snippet}
</Modals>
