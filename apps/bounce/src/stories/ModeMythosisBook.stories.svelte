<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'MODE_MYTHOSIS/book',
	});
</script>

<script lang="ts">
	import {
		StoryGameTemplate,
		StoryLocale,
		type TemplateArgs,
		templateArgs,
	} from 'components-storybook';
	import { randomInteger } from 'utils-shared/random';

	import Game from '../components/Game.svelte';
	import { setContext } from '../game/context';
	import { playBet } from '../game/utils';
	import books from './data/mythosis_books';
	import { useBetMode } from './storyBetMode';

	setContext();
	useBetMode('mythosis');
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
	name="random"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			const index = randomInteger({ min: 0, max: books.length - 1 });
			const data = books[index];
			console.log('Running a book at index', index);
			await playBet({ ...data, state: data.events });
		},
	})}
	{template}
/>

<Story
	name="split"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			// First book that hits a mythosis tile — up to 8 DVDs on the board.
			const data = books.find((book) => book.events.some((e) => e.type === 'split')) ?? books[0];
			await playBet({ ...data, state: data.events });
		},
	})}
	{template}
/>

<Story
	name="wincap"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			// The fixture always contains the mode's wincap book — pick it by payout
			// rather than by position, which the sampler's de-duplication can shift.
			const data = books.reduce((best, book) =>
				book.payoutMultiplier > best.payoutMultiplier ? book : best,
			);
			await playBet({ ...data, state: data.events });
		},
	})}
	{template}
/>
