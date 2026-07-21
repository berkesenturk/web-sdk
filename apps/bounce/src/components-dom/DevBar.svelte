<script lang="ts">
	import { stateGame } from '../game/stateGame.svelte';
	import { playBet } from '../game/utils';

	// Dev-only helpers (rendered only under `vite dev`): replay the last played
	// round's book and a live speed multiplier for round animations. Bypasses
	// the bet machine on purpose — no wallet calls, pure animation replay.
	// Gated on the actual playback flag (works in replay mode too, where the
	// xstate machine never reads as idle).
	const canReplay = $derived(!stateGame.betPlaying && stateGame.lastBet != null);

	const replay = async () => {
		if (!canReplay || !stateGame.lastBet) return;
		stateGame.skip = false;
		await playBet(stateGame.lastBet);
	};
</script>

<div class="dev-bar">
	<span class="tag">DEV</span>
	<span class="ev">
		{stateGame.betPlaying ? `event ${stateGame.devEventIndex}/${Math.max(0, stateGame.devEventCount - 1)}` : '—'}
	</span>
	<button onclick={replay} disabled={!canReplay}>⟲ replay round</button>
	<label>
		speed ×{stateGame.devSpeed.toFixed(2)}
		<input
			type="range"
			min="0.25"
			max="4"
			step="0.25"
			value={stateGame.devSpeed}
			oninput={(e) => (stateGame.devSpeed = Number(e.currentTarget.value))}
		/>
	</label>
</div>

<style>
	.dev-bar {
		position: fixed;
		right: 10px;
		top: 10px;
		z-index: 20;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 6px 10px;
		border-radius: 8px;
		background: rgba(10, 14, 24, 0.82);
		border: 1px solid #33415c;
		color: #cfe0ff;
		font: 600 12px/1.4 'Courier New', monospace;
	}
	.tag {
		color: #ffd94d;
		letter-spacing: 2px;
	}
	.ev {
		min-width: 92px;
		color: #8fe3a8;
	}
	button {
		background: #1d2940;
		color: #cfe0ff;
		border: 1px solid #3d5078;
		border-radius: 6px;
		padding: 4px 8px;
		font: inherit;
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.4;
		cursor: default;
	}
	label {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	input[type='range'] {
		width: 110px;
		accent-color: #ffd94d;
	}
</style>
