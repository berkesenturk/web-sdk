<script lang="ts">
	import { stateBet } from 'state-shared';

	import { getContext } from '../game/context';
	import { stateGameDerived } from '../game/stateGame.svelte';
	import { tvTransform } from '../game/tvLayout';
	import type { BetMode } from '../game/types';

	// Wall sign + retro-TV mode modal (DOM overlay over the pixi canvas).
	// The sign hangs left of the cabinet, top-aligned with it; clicking it opens
	// the modal where a mode is STAGED (rows or the MOD knob) and only ✓ applies
	// it. Applying switches the REAL bet mode (stateBet.activeBetModeKey — the
	// play request sends it verbatim, and the RGS serves that mode's books).
	// ✕/backdrop discard. All values from the mode-selector design spec.
	const context = getContext();

	const MODES: { key: BetMode; label: string }[] = [
		{ key: 'normal', label: 'NORMAL' },
		{ key: 'corner_boost', label: 'CORNER BOOST' },
		{ key: 'mythosis', label: 'MYTHOSIS' },
		{ key: 'mythosis_plus', label: 'MYTHOSIS+' },
	];

	let open = $state(false);
	let staged = $state<BetMode>('normal');
	const stagedIndex = $derived(MODES.findIndex((m) => m.key === staged));
	const appliedLabel = $derived(
		(MODES.find((m) => m.key === stateBet.activeBetModeKey) ?? MODES[0]).label,
	);

	// The mode must not change while a round is running: lock the sign (and the
	// modal's ✓, for the autospin edge where a round starts while the modal is
	// open) on the same !isIdle gate as the cabinet's BAHİS knobs / OTO switch.
	const locked = $derived(!context.stateXstateDerived.isIdle());

	const press = () => context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
	const openModal = () => {
		if (locked) return;
		press();
		staged = (MODES.find((m) => m.key === stateBet.activeBetModeKey) ?? MODES[0]).key;
		open = true;
	};
	const cancel = () => {
		press();
		open = false;
	};
	const apply = () => {
		if (locked) return;
		press();
		if (staged !== stateBet.activeBetModeKey) {
			stateBet.activeBetModeKey = staged;
			// Wipe the previous mode's board to the hidden "?" skeleton so the
			// stale reveal doesn't linger, and ask the dev RGS to pre-warm the
			// new mode's books (first play otherwise stalls on decompression).
			stateGameDerived.clearBoard();
			fetch(`/dev/warm-mode?mode=${staged}`, { method: 'POST' }).catch(() => {});
		}
		open = false;
	};

	// Sign tracks the cabinet: spec px are treated as rig px and scaled by the
	// cabinet's canvas scale, anchored to the cabinet's top-left (rig y=10 is
	// the cabinet's visible top edge — see tvLayout.ts). On width-constrained
	// viewports tv.x is 0 and the wall slot vanishes — clamp the sign on-screen
	// (over the cabinet) so the only entry point to the mode modal stays
	// reachable.
	const tv = $derived(tvTransform(context.stateLayoutDerived.canvasSizes()));
	const s = $derived(tv.scale);
	const signLeft = $derived(Math.max(8, tv.x - (56 + 196) * s));
</script>

<button
	class="mode-sign"
	style="left: {signLeft}px; top: {tv.y + 10 * s}px; --s: {s}"
	disabled={locked}
	onclick={openModal}
>
	<div class="sign-well">
		<div class="sign-title">CHANGE<br />THE MODE</div>
		<div class="sign-mode">{appliedLabel}</div>
	</div>
</button>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="mode-backdrop" onclick={cancel}>
		<div class="mode-tv" onclick={(e) => e.stopPropagation()}>
			<div class="brand-rail">
				<span class="brand-name">MODE·VISION</span>
				<span class="led"></span>
			</div>
			<div class="crt-bezel">
				<div class="crt-screen">
					<div class="crt-header">── GAME MODE ──</div>
					{#each MODES as mode (mode.key)}
						<button
							class="mode-row"
							class:staged={mode.key === staged}
							onclick={() => {
								press();
								staged = mode.key;
							}}
						>
							<span class="marker">{mode.key === staged ? '▸' : ''}</span>
							<span>{mode.label}</span>
						</button>
					{/each}
					<div class="overlay scanlines"></div>
					<div class="overlay glare"></div>
				</div>
			</div>
			<div class="mode-deck">
				<div class="knob-block">
					<button
						class="knob"
						aria-label="cycle mode"
						style="transform: rotate({stagedIndex * 90}deg)"
						onclick={() => {
							press();
							staged = MODES[(stagedIndex + 1) % MODES.length].key;
						}}
					></button>
					<div class="knob-label">MOD</div>
				</div>
				<div class="deck-readout">{MODES[stagedIndex].label}</div>
			</div>
			<div class="confirm-row">
				<button class="hw-btn ok" aria-label="apply mode" disabled={locked} onclick={apply}>✓</button>
				<button class="hw-btn no" aria-label="cancel" onclick={cancel}>✕</button>
			</div>
			<div class="feet"><span class="foot"></span><span class="foot"></span></div>
		</div>
	</div>
{/if}

<style>
	/* ---- shared chassis tokens (design spec) ---- */
	.mode-sign,
	.mode-tv {
		background: linear-gradient(175deg, #b9c692 0%, #a4b478 45%, #8fa065 100%);
		border: 5px solid #6b4a35;
		box-shadow:
			0 24px 44px rgba(0, 0, 0, 0.5),
			inset 0 2px 0 rgba(255, 255, 255, 0.35),
			inset 0 -10px 18px rgba(60, 70, 30, 0.35);
	}

	/* ---- A. wall sign (scales with the cabinet via --s) ---- */
	.mode-sign {
		position: absolute;
		width: calc(196px * var(--s));
		padding: calc(12px * var(--s));
		border-radius: calc(18px * var(--s));
		border-width: calc(5px * var(--s));
		cursor: pointer;
		animation: sign-breathe 2.2s ease-in-out infinite;
		z-index: 5;
	}
	.mode-sign:hover {
		filter: brightness(1.15);
	}
	/* Locked while a round runs: stop breathing, dim, ignore hover. */
	.mode-sign:disabled {
		animation: none;
		opacity: 0.45;
		cursor: default;
	}
	.mode-sign:disabled:hover {
		filter: none;
	}
	@keyframes sign-breathe {
		0%,
		100% {
			opacity: 0.85;
		}
		50% {
			opacity: 1;
		}
	}
	.sign-well,
	.deck-readout {
		background: linear-gradient(180deg, #261b0e, #150e06);
		box-shadow:
			inset 0 2px 6px rgba(0, 0, 0, 0.8),
			0 1px 0 rgba(255, 255, 255, 0.25);
	}
	.sign-well {
		border-radius: calc(10px * var(--s));
		padding: calc(16px * var(--s)) calc(10px * var(--s));
		text-align: center;
	}
	.sign-title {
		font-family: 'Courier New', monospace;
		font-size: calc(22px * var(--s));
		font-weight: 700;
		letter-spacing: calc(2px * var(--s));
		line-height: 1.35;
		color: #f7a842;
		text-shadow:
			0 0 6px rgba(247, 160, 50, 0.9),
			0 0 14px rgba(247, 160, 50, 0.45);
	}
	.sign-mode {
		margin-top: calc(10px * var(--s));
		font-family: 'Courier New', monospace;
		font-size: calc(13px * var(--s));
		font-weight: 700;
		letter-spacing: calc(2px * var(--s));
		color: #6fc9f0;
		text-shadow: 0 0 6px rgba(110, 200, 240, 0.8);
	}

	/* ---- B. modal ---- */
	.mode-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(10, 12, 18, 0.5);
		backdrop-filter: blur(7px);
		display: flex;
		align-items: center;
		justify-content: center;
		animation: backdrop-fade 0.25s ease-out;
		z-index: 10;
	}
	@keyframes backdrop-fade {
		from {
			opacity: 0;
		}
	}
	.mode-tv {
		position: relative;
		width: 310px;
		border-radius: 28px;
		padding: 16px 16px 12px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		animation: tv-enter 0.42s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	@keyframes tv-enter {
		0% {
			transform: scale(0.6) translateY(40px);
			opacity: 0;
		}
		60% {
			transform: scale(1.05) translateY(-4px);
			opacity: 1;
		}
		100% {
			transform: scale(1) translateY(0);
		}
	}

	.brand-rail {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 4px;
	}
	.brand-name {
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 3px;
		color: #4a4430;
		text-shadow: 0 1px 0 rgba(255, 255, 255, 0.4);
	}
	.led {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 30%, #ff9d84, #d9331b 70%);
		box-shadow: 0 0 7px rgba(230, 60, 30, 0.8);
		animation: led-blink 2s step-end infinite;
	}
	@keyframes led-blink {
		0%,
		55% {
			opacity: 1;
		}
		56%,
		100% {
			opacity: 0.15;
		}
	}

	.crt-bezel {
		background: linear-gradient(180deg, #6e523c, #543c2b);
		border-radius: 20px;
		padding: 11px;
		box-shadow:
			inset 0 2px 4px rgba(0, 0, 0, 0.5),
			0 1px 0 rgba(255, 255, 255, 0.25);
	}
	.crt-screen {
		position: relative;
		background: radial-gradient(130% 130% at 50% 40%, #232a45 0%, #1a2036 55%, #12172a 100%);
		box-shadow: inset 0 0 34px rgba(0, 0, 0, 0.7), inset 0 0 3px rgba(160, 200, 255, 0.25);
		border-radius: 15px;
		padding: 16px 14px 18px;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.crt-header {
		font-family: 'Courier New', monospace;
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 3px;
		color: #5a6f8f;
		text-align: center;
		margin-bottom: 6px;
	}
	.mode-row {
		display: flex;
		align-items: center;
		font-family: 'Courier New', monospace;
		font-size: 17px;
		font-weight: 700;
		letter-spacing: 1px;
		padding: 6px 8px;
		border-radius: 7px;
		border: none;
		background: none;
		color: #5a6f8f;
		cursor: pointer;
		text-align: left;
	}
	.mode-row:hover {
		filter: brightness(1.25);
	}
	.mode-row .marker {
		width: 14px;
		flex: none;
	}
	.mode-row.staged {
		color: #f7a842;
		text-shadow:
			0 0 6px rgba(247, 160, 50, 0.9),
			0 0 14px rgba(247, 160, 50, 0.45);
		background: rgba(247, 160, 50, 0.1);
	}
	.overlay {
		position: absolute;
		inset: 0;
		border-radius: 15px;
		pointer-events: none;
	}
	.scanlines {
		background: repeating-linear-gradient(
			180deg,
			rgba(0, 0, 0, 0.13) 0 2px,
			transparent 2px 5px
		);
	}
	.glare {
		background:
			radial-gradient(90% 60% at 28% 8%, rgba(255, 255, 255, 0.1), transparent 55%),
			radial-gradient(140% 140% at 50% 50%, transparent 62%, rgba(0, 0, 0, 0.42) 100%);
	}

	.mode-deck {
		display: flex;
		align-items: center;
		gap: 12px;
		border-radius: 14px;
		padding: 10px 12px;
		background:
			repeating-linear-gradient(
				180deg,
				rgba(0, 0, 0, 0.06) 0 2px,
				rgba(255, 255, 255, 0.05) 2px 6px
			),
			linear-gradient(180deg, #9fb073, #8a9a60);
	}
	.knob-block {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3px;
	}
	.knob {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		border: 4px solid #6b4a35;
		background: radial-gradient(circle at 42% 36%, #c3cf9e, #acb984 55%, #8fa065 100%);
		box-shadow:
			0 3px 6px rgba(0, 0, 0, 0.4),
			inset 0 2px 0 rgba(255, 255, 255, 0.4);
		cursor: pointer;
		position: relative;
		transition: transform 0.35s cubic-bezier(0.2, 0.9, 0.25, 1.2);
	}
	.knob::after {
		content: '';
		position: absolute;
		left: 50%;
		top: 4px;
		width: 4px;
		height: 16px;
		margin-left: -2px;
		border-radius: 2px;
		background: #4d5832;
	}
	.knob-label {
		font-size: 9px;
		font-weight: 800;
		letter-spacing: 2px;
		color: #4a4430;
		text-shadow: 0 1px 0 rgba(255, 255, 255, 0.4);
	}
	.deck-readout {
		flex: 1;
		align-self: stretch;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 10px;
		font-family: 'Courier New', monospace;
		font-size: 14px;
		font-weight: 700;
		letter-spacing: 2px;
		color: #f7a842;
		text-shadow:
			0 0 6px rgba(247, 160, 50, 0.9),
			0 0 14px rgba(247, 160, 50, 0.45);
	}

	.confirm-row {
		display: flex;
		justify-content: center;
		gap: 22px;
	}
	.hw-btn {
		width: 54px;
		height: 54px;
		border-radius: 50%;
		font-size: 22px;
		font-weight: 800;
		color: #f2ecd8;
		cursor: pointer;
		box-shadow:
			0 4px 8px rgba(0, 0, 0, 0.45),
			inset 0 2px 0 rgba(255, 255, 255, 0.3);
	}
	.hw-btn:hover {
		filter: brightness(1.15);
	}
	.hw-btn:active {
		transform: translateY(2px);
		box-shadow:
			0 2px 4px rgba(0, 0, 0, 0.45),
			inset 0 2px 0 rgba(255, 255, 255, 0.3);
	}
	.hw-btn:disabled {
		opacity: 0.45;
		cursor: default;
	}
	.hw-btn:disabled:hover {
		filter: none;
	}
	.hw-btn:disabled:active {
		transform: none;
	}
	.hw-btn.ok {
		background: linear-gradient(180deg, #7ba05a, #5d7a3e);
		border: 3px solid #4a6130;
	}
	.hw-btn.no {
		background: linear-gradient(180deg, #c25b46, #9c3f2e);
		border: 3px solid #7d3123;
	}

	.feet {
		display: flex;
		justify-content: space-between;
		padding: 0 14px;
		margin-bottom: -22px;
	}
	.foot {
		width: 48px;
		height: 22px;
		border-radius: 0 0 8px 8px;
		background: linear-gradient(180deg, #5a3f2d, #3c2a1d);
		transform: perspective(60px) rotateX(-14deg);
	}
</style>
