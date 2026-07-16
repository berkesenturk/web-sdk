<script lang="ts">
	import { Graphics, Text, type GraphicsProps } from 'pixi-svelte';
	import { Button } from 'components-pixi';
	import { stateModal, stateSound } from 'state-shared';

	import { getContext } from '../game/context';

	// Retro dropdown for the cabinet's baked MENÜ pill. The replica pill (same
	// olive style, colors sampled from the cabinet art) covers the baked one so
	// its label can flip MENÜ <-> EXIT; while open, a vertical stack of items in
	// the same pill style opens upward from it. Game.svelte renders this in its
	// own layer after the SDK UI (whose BALANCE box covers the baked pill), so
	// pill + dropdown stay visible and adjacent.
	const context = getContext();
	let open = $state(false);
	const pressSound = () => context.eventEmitter.broadcast({ type: 'soundPressGeneral' });

	// Baked MENÜ pill measured from the cabinet art (rig px, y-down). All three
	// baked pills (MENÜ/SES/BİLGİ) are ~31x12; the replica and the dropdown
	// items use the same size so the whole column reads uniform.
	const MENU_PILL = { x: 39.5, y: 552.5, width: 32, height: 12.5 };
	// spacing = pill height + the 2px gap the baked pills use between each other
	const ITEM = { width: 32, height: 12.5, spacing: 14.5 };

	const soundLabel = $derived(stateSound.volumeValueMaster === 0 ? 'SOUND OFF' : 'SOUND ON');
	const items = $derived([
		// bottom-up stack: first item sits closest to the MENÜ pill
		{
			label: soundLabel,
			onpress: () => {
				pressSound();
				stateSound.volumeValueMaster = stateSound.volumeValueMaster === 0 ? 50 : 0;
			},
		},
		{
			label: 'SETTINGS',
			onpress: () => {
				pressSound();
				open = false;
				stateModal.modal = { name: 'settings' };
			},
		},
		{
			label: 'INFO',
			onpress: () => {
				pressSound();
				open = false;
				stateModal.modal = { name: 'gameRules' };
			},
		},
		{
			label: 'PAYTABLE',
			onpress: () => {
				pressSound();
				open = false;
				stateModal.modal = { name: 'payTable' };
			},
		},
	]);

	// Items share the pill's column and stack upward directly from it.
	const itemX = MENU_PILL.x;
	const itemY = (index: number) => MENU_PILL.y - (index + 1) * ITEM.spacing;

	const drawPill =
		(width: number, height: number, hovered: boolean): GraphicsProps['draw'] =>
		(g) => {
			g.roundRect(0, 0, width, height, 4.5);
			g.fill(hovered ? 0x5d6a40 : 0x4d5832);
			g.roundRect(0, 0, width, height, 4.5);
			g.stroke({ color: 0x49542f, width: 1, alpha: 0.9 });
		};
</script>

{#snippet pill(label: string, width: number, height: number, hovered: boolean, center: { x: number; y: number })}
	<Graphics draw={drawPill(width, height, hovered)} />
	<Text
		x={center.x}
		y={center.y}
		anchor={0.5}
		scale={0.2}
		text={label}
		style={{
			fontFamily: 'proxima-nova',
			fontSize: 24,
			fontWeight: '800',
			letterSpacing: 1,
			fill: 0xe3dfc4,
		}}
	/>
{/snippet}

{#if open}
	{#each items as item, index (item.label)}
		<Button
			x={itemX}
			y={itemY(index)}
			anchor={0.5}
			sizes={{ width: ITEM.width, height: ITEM.height }}
			onpress={item.onpress}
		>
			{#snippet children({ center, hovered })}
				{@render pill(item.label, ITEM.width, ITEM.height, hovered, center)}
			{/snippet}
		</Button>
	{/each}
{/if}

<Button
	x={MENU_PILL.x}
	y={MENU_PILL.y}
	anchor={0.5}
	sizes={{ width: MENU_PILL.width, height: MENU_PILL.height }}
	onpress={() => {
		pressSound();
		open = !open;
	}}
>
	{#snippet children({ center, hovered })}
		{@render pill(open ? 'EXIT' : 'MENÜ', MENU_PILL.width, MENU_PILL.height, hovered, center)}
	{/snippet}
</Button>
