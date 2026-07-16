<script lang="ts">
	import type { Snippet } from 'svelte';

	import { stateUi } from 'state-shared';
	import { BLACK } from 'constants-shared/colors';
	import { EnableSpaceHold } from 'components-shared';
	import { Container, Rectangle } from 'pixi-svelte';
	import UiFadeContainer from 'components-ui-pixi/src/components/UiFadeContainer.svelte';
	import ButtonMenu from 'components-ui-pixi/src/components/ButtonMenu.svelte';
	import ButtonTurbo from 'components-ui-pixi/src/components/ButtonTurbo.svelte';
	import ButtonPayTable from 'components-ui-pixi/src/components/ButtonPayTable.svelte';
	import ButtonGameRules from 'components-ui-pixi/src/components/ButtonGameRules.svelte';
	import ButtonSettings from 'components-ui-pixi/src/components/ButtonSettings.svelte';
	import ButtonSoundSwitch from 'components-ui-pixi/src/components/ButtonSoundSwitch.svelte';
	import ButtonMenuClose from 'components-ui-pixi/src/components/ButtonMenuClose.svelte';
	import LabelWin from 'components-ui-pixi/src/components/LabelWin.svelte';
	import LabelBet from 'components-ui-pixi/src/components/LabelBet.svelte';

	import { getContext } from '../game/context';
	import { CONTROL_BAND_RATIO } from '../game/constants';

	// Bounce-specific replay UI: the shared UIReplay stacks menu/turbo/win/bet
	// over the TV cabinet, so this lays them out as one horizontal row overlaid
	// translucently on the cabinet bottom (the TV fills the whole canvas). The
	// row scales so its tallest element (the label tile) fills the control
	// band, clamped so the full row always fits the window width.
	type Props = { gameName: Snippet; logo: Snippet };
	const props: Props = $props();
	const context = getContext();

	const canvas = $derived.by(context.stateLayoutDerived.canvasSizes);
	const band = $derived(canvas.height * CONTROL_BAND_RATIO);
	const rs = $derived(Math.min(band / 135, canvas.width / 1600));
	const rowY = $derived(canvas.height - band / 2);
	const centerX = $derived(canvas.width / 2);
	const ROW_ALPHA = 0.7;

	// Row slots relative to the center, in row-design px (scaled by rs).
	// Buttons are 150x150 at scale 1; the stacked label tile is 603x135
	// anchored at its top (visual center y=+47), hence the label y-offset
	// that recenters it.
	const MENU_X = -675;
	const TURBO_X = -515;
	const WIN_X = -160;
	const BET_X = 445;
	const BUTTON_SCALE = 0.8;
	const LABEL_SCALE = 0.95;
	const LABEL_Y_OFFSET = -47 * LABEL_SCALE;
	const DRAWER_STEP = 155;
</script>

<EnableSpaceHold />

<UiFadeContainer>
	<Container x={20}>
		{@render props.gameName()}
	</Container>

	<Container x={context.stateLayoutDerived.canvasSizes().width - 20}>
		{@render props.logo()}
	</Container>

	<Container alpha={ROW_ALPHA}>
		<Container x={centerX + MENU_X * rs} y={rowY} scale={BUTTON_SCALE * rs}>
			<ButtonMenu anchor={0.5} />
		</Container>

		<Container x={centerX + TURBO_X * rs} y={rowY} scale={BUTTON_SCALE * rs}>
			<ButtonTurbo anchor={0.5} />
		</Container>

		<Container x={centerX + WIN_X * rs} y={rowY + LABEL_Y_OFFSET * rs} scale={LABEL_SCALE * rs}>
			<LabelWin stacked />
		</Container>

		<Container x={centerX + BET_X * rs} y={rowY + LABEL_Y_OFFSET * rs} scale={LABEL_SCALE * rs}>
			<LabelBet stacked />
		</Container>
	</Container>

	{#if stateUi.menuOpen}
		<Rectangle
			eventMode="static"
			cursor="pointer"
			alpha={0.5}
			anchor={0.5}
			backgroundColor={BLACK}
			width={context.stateLayoutDerived.canvasSizes().width}
			height={context.stateLayoutDerived.canvasSizes().height}
			x={context.stateLayoutDerived.canvasSizes().width * 0.5}
			y={context.stateLayoutDerived.canvasSizes().height * 0.5}
			onpointerup={() => (stateUi.menuOpen = false)}
		/>

		<Container x={centerX + MENU_X * rs} y={rowY} scale={rs}>
			<Container scale={BUTTON_SCALE} y={-DRAWER_STEP * 4}>
				<ButtonPayTable anchor={0.5} />
			</Container>

			<Container scale={BUTTON_SCALE} y={-DRAWER_STEP * 3}>
				<ButtonGameRules anchor={0.5} />
			</Container>

			<Container scale={BUTTON_SCALE} y={-DRAWER_STEP * 2}>
				<ButtonSettings anchor={0.5} />
			</Container>

			<Container scale={BUTTON_SCALE} y={-DRAWER_STEP}>
				<ButtonSoundSwitch anchor={0.5} />
			</Container>

			<Container scale={BUTTON_SCALE}>
				<ButtonMenuClose anchor={0.5} />
			</Container>
		</Container>
	{/if}
</UiFadeContainer>
