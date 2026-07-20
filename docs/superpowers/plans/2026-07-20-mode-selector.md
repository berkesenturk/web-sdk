# Mode Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wall sign + retro-TV modal that stages/applies a cosmetic `visualMode`, with board effects: mythosis tile-art swap, splitting clone DVDs, corner pulse.

**Architecture:** One DOM overlay component (`ModeSelector.svelte`) rendered from `Game.svelte` next to the existing HTML `<Modals>`, driving a new `stateGame.visualMode` field. Pixi-side effects hook into existing components (`ZoneTile`, `ZoneTileAnimations`, `HitFx`, `CornerTile`) plus one new pixi component (`CloneDiscs.svelte`) that simulates decorative clone DVDs. A shared pure predicate `isVisualMitosis` (boardGeometry) keeps tile art, hit FX, and clone spawning in agreement.

**Tech Stack:** Svelte 5 runes, pixi-svelte (pixi.js 8), plain CSS in the DOM component. No new dependencies.

**Spec:** `web-sdk/docs/superpowers/specs/2026-07-20-mode-selector-design.md` — read it first; its theme tokens and layout values are normative for Task 2.

## Global Constraints

- Gameplay is untouched: never change `stateBet.activeBetModeKey`, the play request, HUD values, or booked FX behaviour outside the cosmetic swaps below.
- `stateGame.visualMode` values: `'normal' | 'corner_rush' | 'mythosis' | 'mythosis_plus'`. Display labels: `NORMAL`, `CORNER RUSH`, `MYTHOSIS`, `MYTHOSIS+`.
- All DOM screen/readout text `'Courier New', monospace`; no native form controls (no `<select>`, `<input>`).
- This app has no unit-test infra. Each task's test cycle = `timeout 150 pnpm build` (from `apps/bounce`; success = "Wrote site to build" or "✔ done" in output — the build process never exits on its own) + a headless verification against the dev server on :3007.
- Headless driver rules (hard-won): playwright-core + `/usr/bin/google-chrome`, args `--ignore-certificate-errors --no-sandbox`, URL `https://localhost:3007/?rgs_url=localhost:3007&sessionID=mock&currency=USD&device=desktop&lang=en`, ~16s warmup. ONE dial click per round, wait ≥26s before the next (a second mid-round click = skip). Probe live state ONLY via `/src/...` module paths (e.g. `import('/src/game/stateGame.svelte.ts')`) — `/node_modules/...` paths get a different module instance.
- Commit after every task to `feat/bounce-app` (repo root `web-sdk/`), message ending with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Write driver scripts to the session scratchpad, not the repo.

---

### Task 1: `visualMode` state + shared mitosis predicate

**Files:**
- Modify: `apps/bounce/src/game/types.ts` (add `VisualMode`)
- Modify: `apps/bounce/src/game/stateGame.svelte.ts` (add `visualMode` field)
- Modify: `apps/bounce/src/game/boardGeometry.ts` (add `isVisualMitosis`)

**Interfaces:**
- Produces: `type VisualMode = 'normal' | 'corner_rush' | 'mythosis' | 'mythosis_plus'` (types.ts); `stateGame.visualMode: VisualMode`; `isVisualMitosis(zone: Zone, visualMode: VisualMode): boolean` (boardGeometry.ts). All later tasks consume these exact names.

- [ ] **Step 1: Add the type** — in `types.ts`, after the `DvdMode` line:

```ts
// Cosmetic mode from the wall-sign selector (ModeSelector). Purely visual:
// gameplay always plays the booked `normal` mode regardless of this value.
export type VisualMode = 'normal' | 'corner_rush' | 'mythosis' | 'mythosis_plus';
```

- [ ] **Step 2: Add the state field** — in `stateGame.svelte.ts`: add `VisualMode` to the type-import from `./types`, and inside the `$state({...})` after the `scanlines` field:

```ts
	// Cosmetic mode from the wall-sign selector (see ModeSelector.svelte).
	// Display preference like `scanlines`: untouched by settle()/reset().
	visualMode: 'normal' as VisualMode,
```

- [ ] **Step 3: Add the predicate** — in `boardGeometry.ts`: add `VisualMode` to the type-import from `./types`, and after `hitVisualZone`:

```ts
// Which plain gem zones the MYTHOSIS modes dress up as mitosis cells (art/FX
// only — booked behaviour is untouched). Pure function of zoneIndex so tile
// art (ZoneTile), impact FX (HitFx) and clone spawning (CloneDiscs) always
// agree. ~1-in-5 for mythosis, 1-in-2 for mythosis_plus.
export const isVisualMitosis = (zone: Zone, visualMode: VisualMode): boolean => {
	if (zone.value <= 0 || zone.isGlow || zone.isDead) return false;
	if (visualMode === 'mythosis') return zone.zoneIndex % 5 === 2;
	if (visualMode === 'mythosis_plus') return zone.zoneIndex % 2 === 0;
	return false;
};
```

- [ ] **Step 4: Build** — `cd /home/plato/bounce_stake/web-sdk/apps/bounce && timeout 150 pnpm build` → expect "Wrote site to build" / "✔ done" in output; no TS errors mentioning the new symbols.

- [ ] **Step 5: Commit** — `git add apps/bounce/src/game && git commit -m "Add cosmetic visualMode state and shared mitosis predicate"` (+ trailer).

---

### Task 2: `ModeSelector.svelte` (DOM sign + modal) and mount

**Files:**
- Create: `apps/bounce/src/components-dom/ModeSelector.svelte`
- Modify: `apps/bounce/src/components/Game.svelte` (mount it)

**Interfaces:**
- Consumes: `stateGame.visualMode` (writes on ✓), `tvTransform` from `../game/tvLayout`, `getContext` from `../game/context` (for `stateLayoutDerived.canvasSizes()` and `eventEmitter.broadcast({ type: 'soundPressGeneral' })`), `VisualMode` from `../game/types`.
- Produces: `<ModeSelector />` DOM component; CSS classes `mode-sign`, `mode-backdrop`, `mode-tv` (used by the headless driver's selectors).

- [ ] **Step 1: Write the component** — full content of `components-dom/ModeSelector.svelte` (new directory; DOM components live apart from the pixi ones):

```svelte
<script lang="ts">
	import { getContext } from '../game/context';
	import { stateGame } from '../game/stateGame.svelte';
	import { tvTransform } from '../game/tvLayout';
	import type { VisualMode } from '../game/types';

	// Wall sign + retro-TV mode modal (DOM overlay over the pixi canvas).
	// The sign hangs left of the cabinet, top-aligned with it; clicking it opens
	// the modal where a mode is STAGED (rows or the MOD knob) and only ✓ applies
	// it to stateGame.visualMode. ✕/backdrop discard. Staging never leaks to the
	// live game. All values from the mode-selector design spec.
	const context = getContext();

	const MODES: { key: VisualMode; label: string }[] = [
		{ key: 'normal', label: 'NORMAL' },
		{ key: 'corner_rush', label: 'CORNER RUSH' },
		{ key: 'mythosis', label: 'MYTHOSIS' },
		{ key: 'mythosis_plus', label: 'MYTHOSIS+' },
	];

	let open = $state(false);
	let staged = $state<VisualMode>('normal');
	const stagedIndex = $derived(MODES.findIndex((m) => m.key === staged));
	const appliedLabel = $derived(MODES.find((m) => m.key === stateGame.visualMode)!.label);

	const press = () => context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
	const openModal = () => {
		press();
		staged = stateGame.visualMode;
		open = true;
	};
	const cancel = () => {
		press();
		open = false;
	};
	const apply = () => {
		press();
		stateGame.visualMode = staged;
		open = false;
	};

	// Sign tracks the cabinet: spec px are treated as rig px and scaled by the
	// cabinet's canvas scale, anchored to the cabinet's top-left (rig y=10 is
	// the cabinet's visible top edge — see tvLayout.ts).
	const tv = $derived(tvTransform(context.stateLayoutDerived.canvasSizes()));
	const s = $derived(tv.scale);
</script>

<button
	class="mode-sign"
	style="left: {tv.x - (56 + 196) * s}px; top: {tv.y + 10 * s}px; --s: {s}"
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
				<button class="hw-btn ok" aria-label="apply mode" onclick={apply}>✓</button>
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
```

- [ ] **Step 2: Mount it** — in `Game.svelte`: add `import ModeSelector from '../components-dom/ModeSelector.svelte';` with the component imports, and after the closing `</App>` tag (before `<Modals>`):

```svelte
{#if !DESIGN_MODE && !context.stateLayout.showLoadingScreen && stateUi.config.mode !== 'replay'}
	<ModeSelector />
{/if}
```

(`DESIGN_MODE`, `context`, and `stateUi` are already imported/derived in Game.svelte.)

- [ ] **Step 3: Build** — `timeout 150 pnpm build` → "Wrote site to build" / "✔ done", no errors.

- [ ] **Step 4: Headless verify** (dev server on :3007 must be running; start with `pnpm dev` in background if not). Driver checks, with screenshots to the scratchpad:
  1. After warmup: `.mode-sign` exists; bounding box right edge < cabinet left (`tv.x` from probe) and top ≈ `tv.y + 10*s` (±2px); screenshot shows amber sign text + cyan `NORMAL`.
  2. Click `.mode-sign` → `.mode-backdrop` + `.mode-tv` present; screenshot: blurred game behind, TV centred, NORMAL row amber with ▸, readout `NORMAL`.
  3. Click the `MYTHOSIS` row → row amber, readout `MYTHOSIS`, knob `transform` = rotate(180deg); probe `stateGame.visualMode` via `/src/game/stateGame.svelte.ts` → still `'normal'` (staging doesn't leak); sign still says NORMAL.
  4. Click `.hw-btn.no` → modal gone, probe still `'normal'`.
  5. Reopen, stage `CORNER RUSH`, click `.hw-btn.ok` → modal gone, probe `'corner_rush'`, sign shows `CORNER RUSH`.
  6. Reopen, click backdrop (coords outside `.mode-tv`) → closes, probe unchanged.
  7. No page errors in console output.

- [ ] **Step 5: Commit** — `git add apps/bounce/src && git commit -m "Add mode-selector wall sign and retro-TV modal (DOM overlay)"` (+ trailer).

---

### Task 3: Mythosis tile-art swap (ZoneTile + ZoneTileAnimations + HitFx)

**Files:**
- Modify: `apps/bounce/src/components/ZoneTile.svelte`
- Modify: `apps/bounce/src/components/ZoneTileAnimations.svelte`
- Modify: `apps/bounce/src/components/HitFx.svelte`

**Interfaces:**
- Consumes: `isVisualMitosis(zone, stateGame.visualMode)` from Task 1.
- Produces: `ZoneTileAnimations` gains required prop `look: 'gem' | 'mine' | 'mitosis'` (replaces its internal `kind` derivation).

- [ ] **Step 1: ZoneTile** — make the rig reactive to the visual mode; remount on change (`{#key}`) so the new rig plays its own intro:

```svelte
<script lang="ts">
	import { SpineProvider } from 'pixi-svelte';

	import { stateGame } from '../game/stateGame.svelte';
	import { zoneRect, isVisualMitosis } from '../game/boardGeometry';
	import { TILE_SOURCE_SIZE } from '../game/constants';
	import type { Zone } from '../game/types';
	import ZoneTileAnimations from './ZoneTileAnimations.svelte';

	// One wall-zone spine tile. The rig is picked by the zone's flavor (gem =
	// value, mine = dead, mitosis cell = glow); the 100x100 art is centered on
	// the skeleton root, so it is placed at the zone rect's center and scaled to
	// fill the band. Keeps its real assets + reveal/hit animations in every mode
	// (DESIGN_MODE only recolours the non-asset pieces: play area, corners, disc).
	// MYTHOSIS visual modes dress some plain gems up as mitosis cells (art only —
	// see isVisualMitosis); {#key} remounts the rig when the mode flips mid-board.
	let { zone }: { zone: Zone } = $props();

	const look = $derived(
		zone.isDead
			? ('mine' as const)
			: zone.isGlow || isVisualMitosis(zone, stateGame.visualMode)
				? ('mitosis' as const)
				: ('gem' as const),
	);
	const key = $derived(
		look === 'mine' ? 'mineTile' : look === 'mitosis' ? 'mitosisTile' : 'gemTile',
	);
	const r = zoneRect(zone);
</script>

{#key key}
	<SpineProvider
		{key}
		x={r.x + r.w / 2}
		y={r.y + r.h / 2}
		scale={{ x: r.w / TILE_SOURCE_SIZE, y: r.h / TILE_SOURCE_SIZE }}
	>
		<ZoneTileAnimations {zone} {look} />
	</SpineProvider>
{/key}
```

- [ ] **Step 2: ZoneTileAnimations** — accept the look from the parent instead of deriving it (the component captures `kind` at mount time, which is correct — the `{#key}` remount refreshes it):

```ts
let { zone, look }: { zone: Zone; look: 'gem' | 'mine' | 'mitosis' } = $props();
```

and replace the `const kind = zone.isDead ? 'mine' : zone.isGlow ? 'mitosis' : 'gem';` line with:

```ts
const kind = look;
```

(Everything else — `hitAnimation`, gem text, `unrevealed`/`reveal` vs `idle` — already switches on `kind` and works unchanged: mitosis rigs play `idle` loop + `split` hit, which exist in the rig.)

- [ ] **Step 3: HitFx** — visually-swapped tiles pop the mitosis coupon, not the gem value. In the `discBounce` handler replace the `else if (hit.isGlow)` / `else if (hit.value > 0)` branches with:

```ts
			} else if (hit.isGlow || isVisualMitosis(hit, stateGame.visualMode)) {
				// mitosis cell split hands out its ×2 coupon (real or visual-mode dress-up)
				spawn('mitosisPop', 'pop', emitterEvent.position);
			} else if (hit.value > 0) {
```

and add `isVisualMitosis` to the existing `boardGeometry` import.

- [ ] **Step 4: Build** — `timeout 150 pnpm build` → success markers, no errors.

- [ ] **Step 5: Headless verify:**
  1. Warmup; set the mode directly (faster than UI, already covered by Task 2): `page.evaluate(async () => { const m = await import('/src/game/stateGame.svelte.ts'); m.stateGame.visualMode = 'mythosis_plus'; })`.
  2. Screenshot the board: about half the gem tiles now show the mitosis cell art (pink/organic vs gem crystal); with `'mythosis'` only ~1-2 per wall; with `'normal'` the board matches a pre-change screenshot.
  3. Spin one round in `mythosis_plus` (ONE dial click, wait 26s): frames during the round show the mitosis pop coupon when the disc lands on a swapped tile (compare against `zoneIndex % 2 === 0` gem hits in the driver by probing `stateGame.zones` + hit positions — or just visually confirm at least one mitosisPop next to a swapped tile).
  4. TOTAL X / LAST HIT / EARNED still show the booked numbers (LAST HIT shows the gem value, NOT "SPLIT", for a dressed-up tile — booked truth, per spec).
  5. No page errors.

- [ ] **Step 6: Commit** — `git add apps/bounce/src && git commit -m "Dress plain gems as mitosis cells in MYTHOSIS visual modes"` (+ trailer).

---

### Task 4: Corner pulse (CORNER RUSH)

**Files:**
- Modify: `apps/bounce/src/components/CornerTile.svelte`

**Interfaces:**
- Consumes: `stateGame.visualMode`.
- Produces: nothing new.

- [ ] **Step 1: Add the pulse** — pixi-svelte has no `filters` prop, so brightness is approximated by a white rounded-rect wash over the tile (spec fallback). Full new `CornerTile.svelte`:

```svelte
<script lang="ts">
	import { SpineProvider, Rectangle } from 'pixi-svelte';

	import { stateGame } from '../game/stateGame.svelte';
	import { BOARD_SIZES, ZONE_THICKNESS, TILE_SOURCE_SIZE } from '../game/constants';
	import CornerTileAnimations from './CornerTileAnimations.svelte';

	// One corner multiplier tile. `corner` picks which of the 4 board corners
	// (0 TL, 1 TR, 2 BL, 3 BR); the rig is 100x100 art centered on its root,
	// scaled to the zone band.
	let { corner }: { corner: number } = $props();

	const t = ZONE_THICKNESS;
	const x = corner % 2 === 0 ? t / 2 : BOARD_SIZES.width - t / 2;
	const y = corner < 2 ? t / 2 : BOARD_SIZES.height - t / 2;

	// CORNER RUSH visual mode: the corners pulse (scale 1→1.1→1 + a white wash
	// standing in for brightness 1→1.45→1 — pixi-svelte has no filter prop),
	// 0.9s ease-in-out infinite. `wave` runs 0→1→0 per period via cosine.
	const PULSE_MS = 900;
	let wave = $state(0);
	$effect(() => {
		if (stateGame.visualMode !== 'corner_rush') {
			wave = 0;
			return;
		}
		let raf = 0;
		const start = performance.now();
		const loop = (now: number) => {
			const phase = ((now - start) % PULSE_MS) / PULSE_MS;
			wave = 0.5 - 0.5 * Math.cos(2 * Math.PI * phase);
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(raf);
	});
	const pulseScale = $derived((t / TILE_SOURCE_SIZE) * (1 + 0.1 * wave));
</script>

<SpineProvider key="cornerTile" {x} {y} scale={pulseScale}>
	<CornerTileAnimations />
</SpineProvider>
{#if wave > 0}
	<Rectangle
		{x}
		{y}
		anchor={0.5}
		width={t * (1 + 0.1 * wave)}
		height={t * (1 + 0.1 * wave)}
		borderRadius={12}
		backgroundColor={0xffffff}
		backgroundAlpha={0.3 * wave}
	/>
{/if}
```

- [ ] **Step 2: Build** — `timeout 150 pnpm build` → success markers.

- [ ] **Step 3: Headless verify:** set `visualMode = 'corner_rush'` via probe; grab 4 frames ~220ms apart; corner tiles visibly change size/brightness across frames (crop the corner regions and compare pixel means — they must differ by a clear margin between wave≈0 and wave≈1 frames). Set back to `'normal'` → corners static again. No page errors.

- [ ] **Step 4: Commit** — `git add apps/bounce/src && git commit -m "Pulse corner tiles in CORNER RUSH visual mode"` (+ trailer).

---

### Task 5: Clone DVDs (mitosis splitting)

**Files:**
- Create: `apps/bounce/src/components/CloneDiscs.svelte`
- Create: `apps/bounce/src/components/CloneDiscAnimations.svelte`
- Modify: `apps/bounce/src/components/TvScene.svelte` (render `<CloneDiscs />` in `boardContent` after the discs `{#each}`, before `<HitFx />`)

**Interfaces:**
- Consumes: `isVisualMitosis`, `hitVisualZone`, `toPixel`, `INNER` (boardGeometry); `DISC_SIZES`, `DISC_PLATE_NATIVE`, `DISC_SPEED`, `DISC_COLOR_CYCLE`, `BOARD_SIZES`, `ZONE_THICKNESS` (constants); emitter events `boardReset` / `discMove` / `discBounce` / `roundEnd`.
- Produces: `<CloneDiscs />` (no props); `CloneDiscAnimations` with props `{ bounces: number }`.

- [ ] **Step 1: CloneDiscAnimations.svelte** — DiscAnimations' sibling for simulated clones: colour/squash driven by a `bounces` counter prop instead of emitter events:

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import { getContextSpine } from 'pixi-svelte';

	import { DISC_COLOR_CYCLE } from '../game/constants';

	// Rig controller for a simulated clone disc (see CloneDiscs). Same visual
	// language as the real disc's DiscAnimations — spawn intro, fly loop, squash
	// + tint step per contact — but driven by the parent's `bounces` counter
	// (the clone's contacts are simulated, not emitter events).
	let { bounces }: { bounces: number } = $props();

	const spine = getContextSpine();
	const plateSlot = spine.skeleton.findSlot('plate');
	const applyColor = (index: number) => {
		if (!plateSlot) return;
		const c = DISC_COLOR_CYCLE[index % DISC_COLOR_CYCLE.length];
		plateSlot.color.set(((c >> 16) & 0xff) / 255, ((c >> 8) & 0xff) / 255, (c & 0xff) / 255, 1);
	};

	let seen = 0;
	$effect(() => {
		if (bounces === seen) return;
		seen = bounces;
		applyColor(bounces);
		spine.state.setAnimation(0, 'bounce', false);
		spine.state.addAnimation(0, 'fly', true, 0);
	});

	onMount(() => {
		applyColor(0);
		spine.state.setAnimation(0, 'spawn', false);
		spine.state.addAnimation(0, 'fly', true, 0);
	});
</script>
```

- [ ] **Step 2: CloneDiscs.svelte** — spawner + straight-line simulation:

```svelte
<script lang="ts">
	import { Graphics, SpineProvider, type GraphicsProps } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { stateGame } from '../game/stateGame.svelte';
	import { toPixel, hitVisualZone, isVisualMitosis, INNER } from '../game/boardGeometry';
	import {
		BOARD_SIZES,
		ZONE_THICKNESS,
		DISC_SIZES,
		DISC_PLATE_NATIVE,
		DISC_SPEED,
		DISC_COLOR_CYCLE,
	} from '../game/constants';
	import CloneDiscAnimations from './CloneDiscAnimations.svelte';

	// Decorative clone DVDs for the MYTHOSIS visual modes. Every hit on a
	// visually-swapped mitosis tile splits the hitting disc: a clone spawns at
	// the contact and leaves opposite to the hitter (= its incoming direction
	// negated, the mirror of its outgoing direction across the wall normal).
	// Clones fly straight at DISC_SPEED, reflect off the same edge-inset bounds
	// as the real disc, squash + tint-step per contact, and split again when
	// they strike a swapped tile. They NEVER score (visuals only, per spec) and
	// vanish on skip / round end. MAX_CLONES guards the MYTHOSIS+ exponential.
	const context = getContext();

	type Clone = { id: number; x: number; y: number; vx: number; vy: number; bounces: number };

	const rigScale = DISC_SIZES.width / DISC_PLATE_NATIVE.width;
	const halfW = DISC_SIZES.width / 2;
	const halfH = DISC_SIZES.height / 2;
	const t = ZONE_THICKNESS;
	const MIN_X = t + halfW;
	const MAX_X = BOARD_SIZES.width - t - halfW;
	const MIN_Y = t + halfH;
	const MAX_Y = BOARD_SIZES.height - t - halfH;
	const MAX_CLONES = 16;
	const MAX_STEP_MS = 50; // clamp jank frames so clones can't tunnel a wall

	let clones = $state<Clone[]>([]);
	let nextId = 0;

	// Real discs' last two contact pixels, to derive incoming direction at a hit.
	const lastPos = new Map<number, { x: number; y: number }>();
	const prevPos = new Map<number, { x: number; y: number }>();

	const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

	const spawn = (x: number, y: number, dirX: number, dirY: number) => {
		if (clones.length >= MAX_CLONES) return;
		const len = Math.hypot(dirX, dirY);
		// Degenerate direction (first bounce straight from spawn overlap): pick a
		// diagonal so the clone always leaves the wall.
		const [ux, uy] = len > 1e-3 ? [dirX / len, dirY / len] : [Math.SQRT1_2, -Math.SQRT1_2];
		clones.push({
			id: nextId++,
			x: clamp(x, MIN_X, MAX_X),
			y: clamp(y, MIN_Y, MAX_Y),
			vx: ux * DISC_SPEED,
			vy: uy * DISC_SPEED,
			bounces: 0,
		});
	};

	// A clone struck a wall: squash/tint (bounces++), and split off another
	// clone if the tile under the contact is a visually-swapped mitosis cell.
	// `inVx/inVy` is the velocity BEFORE reflection; the child leaves opposite
	// the parent, i.e. along the negated incoming direction.
	const cloneContact = (clone: Clone, inVx: number, inVy: number) => {
		clone.bounces += 1;
		const norm = {
			x: clamp((clone.x - t) / INNER.width, 0, 1),
			y: clamp((clone.y - t) / INNER.height, 0, 1),
		};
		// Snap the struck coordinate to the exact wall so hitVisualZone matches.
		if (clone.x <= MIN_X) norm.x = 0;
		else if (clone.x >= MAX_X) norm.x = 1;
		if (clone.y <= MIN_Y) norm.y = 0;
		else if (clone.y >= MAX_Y) norm.y = 1;
		const hit = hitVisualZone(stateGame.zones, norm);
		if (hit && isVisualMitosis(hit, stateGame.visualMode)) {
			spawn(clone.x, clone.y, -inVx, -inVy);
		}
	};

	const step = (dtRaw: number) => {
		const dt = Math.min(dtRaw, MAX_STEP_MS);
		for (const clone of clones) {
			const inVx = clone.vx;
			const inVy = clone.vy;
			clone.x += clone.vx * dt;
			clone.y += clone.vy * dt;
			let struck = false;
			if (clone.x <= MIN_X || clone.x >= MAX_X) {
				clone.x = clamp(clone.x, MIN_X, MAX_X);
				clone.vx = -clone.vx;
				struck = true;
			}
			if (clone.y <= MIN_Y || clone.y >= MAX_Y) {
				clone.y = clamp(clone.y, MIN_Y, MAX_Y);
				clone.vy = -clone.vy;
				struck = true;
			}
			if (struck) cloneContact(clone, inVx, inVy);
		}
	};

	// Simulation loop: runs only while clones are alive; skip wipes the fleet
	// (skip jumps to the result — clones are round FX).
	$effect(() => {
		if (clones.length === 0) return;
		if (stateGame.skip) {
			clones = [];
			return;
		}
		let raf = 0;
		let last = performance.now();
		const loop = (now: number) => {
			step(now - last);
			last = now;
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(raf);
	});

	context.eventEmitter.subscribeOnMount({
		boardReset: () => {
			clones = [];
			lastPos.clear();
			prevPos.clear();
			if (stateGame.discStart) lastPos.set(0, toPixel(stateGame.discStart));
		},
		discMove: (emitterEvent) => {
			const at = toPixel(emitterEvent.position);
			const prev = lastPos.get(emitterEvent.dvdIndex);
			if (prev) prevPos.set(emitterEvent.dvdIndex, prev);
			lastPos.set(emitterEvent.dvdIndex, at);
		},
		discBounce: (emitterEvent) => {
			if (stateGame.skip) return;
			const hit = hitVisualZone(stateGame.zones, emitterEvent.position);
			if (!hit || !isVisualMitosis(hit, stateGame.visualMode)) return;
			const at = toPixel(emitterEvent.position);
			const from = prevPos.get(emitterEvent.dvdIndex);
			spawn(at.x, at.y, from ? from.x - at.x : 0, from ? from.y - at.y : 0);
		},
		roundEnd: () => {
			clones = [];
		},
	});

	// Same phosphor glow treatment as the real disc (Disc.svelte), one per clone.
	const GLOW_RADIUS = 170;
	const drawGlow = (color: number): GraphicsProps['draw'] => (g) => {
		for (let i = 6; i >= 1; i--) {
			g.circle(0, 0, (GLOW_RADIUS * i) / 6);
			g.fill({ color, alpha: 0.024 });
		}
	};
</script>

{#each clones as clone (clone.id)}
	<Graphics
		x={clone.x}
		y={clone.y}
		draw={drawGlow(DISC_COLOR_CYCLE[clone.bounces % DISC_COLOR_CYCLE.length])}
	/>
	<SpineProvider key="dvd" x={clone.x} y={clone.y} scale={rigScale}>
		<CloneDiscAnimations bounces={clone.bounces} />
	</SpineProvider>
{/each}
```

Note: the child spawned in `cloneContact` gets direction `(-inVx, -inVy)`; for e.g. a left-wall hit with incoming `(-a, b)` the parent reflects to `(a, b)` and the child leaves along `(a, -b)` — both away from the wall, diverging symmetrically. Same geometry as the real-disc split in `discBounce` (`from - at` = negated incoming).

- [ ] **Step 3: Mount** — in `TvScene.svelte`'s `boardContent` snippet, import `CloneDiscs` and render it between the discs `{#each}` and `<HitFx />`:

```svelte
	{#each discs as dvdIndex (dvdIndex)}
		<Disc {dvdIndex} />
	{/each}
	<CloneDiscs />
	<HitFx />
```

- [ ] **Step 4: Build** — `timeout 150 pnpm build` → success markers.

- [ ] **Step 5: Headless verify** (the meaty one):
  1. Set `visualMode = 'mythosis_plus'` via probe (1-in-2 swapped tiles → a split is near-certain within a round).
  2. Spin ONE round (single dial click); capture a frame burst (~10 frames, 400ms apart) plus probe `document`-independent state via the module import if needed.
  3. Expect: at some frame ≥2 DVD plates visible diverging; later frames may show more. Confirm clones bounce (position changes between frames, stays inside the tile band).
  4. Wait for round end (≥26s from click): clones gone (frame shows no discs), EARNED/TOTAL X equal the booked result (probe `/wallet/play` response or `stateBet.winBookEventAmount` — clone hits must not have changed any HUD number mid-round: compare a mid-round `stateGame.runningTotal` probe against the booked `runningTotal` of the last bounce).
  5. Spin one round in `'normal'` mode: no clones ever appear; round plays exactly as before (regression guard).
  6. Skip check: start a round in `mythosis_plus`, wait ~6s (clone likely spawned), click the dial again (= skip) → probe `clones` indirectly by screenshot: discs vanish immediately, result screen clean; no page errors, no runaway rAF (CPU settles).
  7. No page errors in the whole driver run.

- [ ] **Step 6: Commit** — `git add apps/bounce/src && git commit -m "Spawn splitting clone DVDs on mythosis-tile hits"` (+ trailer).

---

### Task 6: Full acceptance pass

**Files:** none new — fixes only if the pass finds issues.

- [ ] **Step 1: Run the spec's acceptance checklist end-to-end headlessly** (fresh page load):
  - Sign top-aligned with cabinet top-left, 56·s gap, breathing (two screenshots ~1.1s apart differ in sign opacity).
  - Modal: backdrop blurred+dimmed, TV crisp/centred; entrance animation caught in an early frame if feasible (screenshot ~150ms after click).
  - Staging isolated: stage w/o confirm → board & sign unchanged; ✓ applies (sign + board react); ✕/backdrop discard.
  - MYTHOSIS: ~1-in-5 tiles swapped. MYTHOSIS+: 1-in-2, splits multiply over a round. CORNER RUSH: pulse. NORMAL: baseline board, no clones, no pulse.
  - One full round per mode plays clean; KREDİ balance advances by booked win only.
- [ ] **Step 2: Fix anything the pass surfaces** (visual offsets, z-index fights with the SDK's HTML modals, etc.), rebuild, re-verify that item.
- [ ] **Step 3: Update the spec doc** if any tuned value diverged (e.g. overlay alpha), commit everything: `git add -A apps/bounce docs && git commit -m "Mode selector acceptance pass"` (+ trailer).

---

## Self-Review Notes

- Spec coverage: sign (T2), modal incl. knob/rows/✓✕/feet/LED (T2), state machine isolation (T2 verify #3-6), tile swap + FX swap (T3), corner pulse (T4), clone splits incl. clones-split-too + 16 cap + skip/round-end despawn + non-scoring (T5), NORMAL untouched + acceptance list (T6). HUD truthfulness asserted in T3.4/T5.5.
- Type consistency: `VisualMode` union and `isVisualMitosis(zone, visualMode)` signatures identical across T1/T2/T3/T5; `look` prop `'gem' | 'mine' | 'mitosis'` matches ZoneTileAnimations' existing `kind` branches; `CloneDiscAnimations` prop `{ bounces: number }` matches usage.
- Known judgement calls: brightness pulse approximated by white wash (no filter support in pixi-svelte); clone contact FX intentionally none (spec); sign scales by `tv.scale` treating spec px as rig px.
