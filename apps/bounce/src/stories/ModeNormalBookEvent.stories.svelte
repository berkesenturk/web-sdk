<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'MODE_NORMAL/bookEvent',
	});
</script>

<script lang="ts">
	import {
		StoryGameTemplate,
		StoryLocale,
		type TemplateArgs,
		templateArgs,
	} from 'components-storybook';

	import Game from '../components/Game.svelte';
	import { setContext } from '../game/context';
	import books from './data/normal_books';
	import { useBetMode } from './storyBetMode';
	import { playEventsFrom } from './storyBookEvent';

	setContext();
	useBetMode('normal');
</script>

{#snippet template(args: TemplateArgs<any>)}
	<StoryGameTemplate
		skipLoadingScreen={args.skipLoadingScreen}
		action={async () => {
			await args.action?.(args.data);
		}}
	>
		<StoryLocale lang="en">
			<Game />
		</StoryLocale>
	</StoryGameTemplate>
{/snippet}

<Story
	name="reveal"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => await playEventsFrom(books, (e) => e.type === 'reveal'),
	})}
	{template}
/>

<Story
	name="bounce (paying tile)"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () =>
			await playEventsFrom(books, (e) => e.type === 'bounce' && e.tileKind === 'zone' && e.value > 0),
	})}
	{template}
/>

<Story
	name="bounce (dead tile 0.00x)"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () =>
			await playEventsFrom(books, (e) => e.type === 'bounce' && e.tileKind === 'dead'),
	})}
	{template}
/>

<Story
	name="bounce (mine, lethal)"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => await playEventsFrom(books, (e) => e.type === 'bounce' && e.lethal),
	})}
	{template}
/>

<Story
	name="corner"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => await playEventsFrom(books, (e) => e.type === 'corner'),
	})}
	{template}
/>

<Story
	name="chain"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => await playEventsFrom(books, (e) => e.type === 'chain'),
	})}
	{template}
/>

<Story
	name="setTotalWin"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => await playEventsFrom(books, (e) => e.type === 'setTotalWin'),
	})}
	{template}
/>

<Story
	name="finalWin (+ domino reveal)"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		// Played after its setTotalWin so EARNED shows the real payout; finalWin
		// also flips every unstruck tile in the end-of-round domino wave, so this
		// is the story to look at a full board of tile faces.
		action: async () =>
			await playEventsFrom(
				books,
				(e) => e.type === 'setTotalWin',
				(e) => e.type === 'finalWin',
			),
	})}
	{template}
/>
