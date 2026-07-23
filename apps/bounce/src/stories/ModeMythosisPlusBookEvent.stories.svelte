<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'MODE_MYTHOSIS_PLUS/bookEvent',
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
	import books from './data/mythosis_plus_books';
	import { useBetMode } from './storyBetMode';
	import { playEventsFrom } from './storyBookEvent';

	setContext();
	useBetMode('mythosis_plus');
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

<!-- The mythosis-only events; the shared ones live under MODE_NORMAL/bookEvent. -->
<Story
	name="reveal (up to 16 DVDs)"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => await playEventsFrom(books, (e) => e.type === 'reveal'),
	})}
	{template}
/>

<Story
	name="bounce (mythosis tile)"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () =>
			await playEventsFrom(books, (e) => e.type === 'bounce' && e.tileKind === 'mythosis'),
	})}
	{template}
/>

<Story
	name="split"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		// Shows the mitosis pop at the contact point. Both children mount there
		// coincident, so they read as one disc until they move — see the
		// MODE_MYTHOSIS_PLUS/book "split" story for them flying apart.
		action: async () => await playEventsFrom(books, (e) => e.type === 'split'),
	})}
	{template}
/>
