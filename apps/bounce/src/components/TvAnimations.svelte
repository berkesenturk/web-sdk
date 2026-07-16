<script lang="ts">
	import { getContextSpine } from 'pixi-svelte';
	import { stateBet } from 'state-shared';

	import { getContext } from '../game/context';

	// Imperative animation control for the TV rig, driven by emitter events.
	// Each animation keys a disjoint set of bones, so every clip gets its own
	// AnimationState track and they can overlap freely.
	const TRACK = { knobs: 0, needle: 1, grille: 2, counter: 3, ctBanner: 4, vuBanner: 5 };

	const context = getContext();
	const spine = getContextSpine();

	const oneShot = (trackIndex: number, name: string) => {
		const entry = spine.state.setAnimation(trackIndex, name, false);
		spine.state.addEmptyAnimation(trackIndex, 0.2, 0);
		return entry;
	};

	// counter-pop follows the resolved win ("total updates"), which lands via
	// setTotalWin → stateBet.winBookEventAmount (no emitter event of its own).
	let previousWinAmount: number | undefined;
	$effect(() => {
		const amount = stateBet.winBookEventAmount;
		if (previousWinAmount !== undefined && amount !== previousWinAmount && amount > 0) {
			oneShot(TRACK.counter, 'counter-pop');
		}
		previousWinAmount = amount;
	});

	context.eventEmitter.subscribeOnMount({
		boardReset: () => {
			oneShot(TRACK.knobs, 'knob-twist');
			spine.state.setAnimation(TRACK.needle, 'vu-needle-swing', true);
		},
		discBounce: () => {
			oneShot(TRACK.grille, 'grille-buzz');
		},
		discCorner: () => {
			oneShot(TRACK.grille, 'grille-buzz');
		},
		roundEnd: () => {
			spine.state.setEmptyAnimation(TRACK.needle, 0.4);
		},
	});
</script>
