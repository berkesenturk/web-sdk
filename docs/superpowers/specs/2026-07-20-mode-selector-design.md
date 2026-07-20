# Mode Selector (retro-TV pop-up) — design

Date: 2026-07-20 · App: `apps/bounce` · Status: approved by user (visual-only wiring, DOM overlay, clone-split addition)

## What

A game-mode selector for the Bounce cabinet, in two pieces:

- **A. Wall sign** ("CHANGE THE MODE") hanging on the office wall left of the TV
  cabinet, top-aligned with the cabinet's top edge. Shows the currently applied
  mode. Click opens the modal.
- **B. Modal pop-up** styled as a small retro TV (sage chassis, CRT screen,
  MOD knob, ✓/✕ hardware buttons) where the player *stages* a mode by clicking
  rows or turning the knob, then confirms with ✓ or discards with ✕/backdrop.

Modes: `NORMAL`, `CORNER RUSH`, `MYTHOSIS`, `MYTHOSIS+`.

## User decisions (locked)

1. **Visual-only wiring.** Gameplay stays on the `normal` bet-mode books; the
   selector never touches `stateBet.activeBetModeKey` or the play request. Mode
   effects are cosmetic (board art + FX only). HUD numbers (TOTAL X, LAST HIT,
   EARNED, KREDİ) always show booked truth.
2. **DOM overlay.** Sign + modal are Svelte DOM components rendered over the
   pixi canvas (like the SDK's `components-ui-html` Modals), using the CSS
   theme tokens from the feature spec verbatim. Board-side effects (tile art
   swap, corner pulse, clone disc) are pixi, inside the existing components.
3. **Clone split.** When the real disc hits a *visually swapped* mythosis tile,
   the DVD "must be two": a decorative clone spawns at the contact point and
   both leave in opposite directions.

## State

`stateGame` (game/stateGame.svelte.ts) gains one field:

```ts
visualMode: 'normal' | 'corner_rush' | 'mythosis' | 'mythosis_plus'
```

- Default `'normal'`. Display preference like `scanlines`: untouched by
  `settle()` / `reset()`, so it survives rounds.
- Distinct from `stateGame.mode` (the booked mode from `reveal`), which keeps
  its current meaning and stays `'normal'`.

`modalOpen` and `stagedMode` live inside the DOM component (plain `$state`);
per the spec's state machine, staging NEVER leaks to the live game/sign/board.

## New component: `src/components-dom/ModeSelector.svelte`

One Svelte file (DOM, no pixi) rendered from `Game.svelte` next to the existing
`<Modals>` block — i.e. outside `<App>`. Hidden while
`context.stateLayout.showLoadingScreen`, in `DESIGN_MODE`, and in replay mode
(`stateUi.config.mode === 'replay'`).

### Wall sign

- Position: computed from `tvTransform(context.stateLayoutDerived.canvasSizes())`
  (the canvas is full-window, so rig→CSS px is `tv.x/tv.y` + `tv.scale`). Spec
  px are treated as rig px and multiplied by `s = tv.scale` so the sign tracks
  and scales with the cabinet:
  - right edge at `cabinetLeft − 56·s` where `cabinetLeft = tv.x`
  - top at `tv.y + 10·s` (rig y=10 is the cabinet's top edge)
  - width `196·s`; inner sizes/fonts also scale by `s`.
- Structure/styling per feature spec: sage chassis frame (radius 18, 5px
  `#6b4a35` border, padding 12) → dark readout well → amber-glow
  `CHANGE\nTHE MODE` (Courier 22/700, ls 2) over the cyan current-mode name
  (Courier 13/700, ls 2, `#6fc9f0` + glow).
- Breathing opacity 0.85→1→0.85 2.2s infinite; hover `brightness(1.15)`;
  cursor pointer; click opens the modal (`stagedMode = applied`).
- Width-constrained viewports (portrait): the wall slot vanishes (`tv.x = 0`),
  so the sign's left edge clamps to `max(8px, tv.x − 252·s)` — it overlaps the
  cabinet's top-left corner but stays reachable (final-review fix).

### Modal (small retro TV)

All values from the feature spec ("Theme tokens" + section B), fixed CSS px:

- Backdrop `position:fixed; inset:0`, `rgba(10,12,18,0.5)` +
  `backdrop-filter: blur(7px)` (blurs the WebGL canvas beneath), 0.25s fade-in.
  Backdrop click = cancel. Inner clicks `stopPropagation`.
- TV entrance keyframes: `scale(0.6) translateY(40px)/opacity 0` → 60%
  `scale(1.05) translateY(-4px)` → settle; 0.42s `cubic-bezier(0.34,1.56,0.64,1)`.
- Chassis 310px wide, radius 28, padding `16 16 12`, gap 12, containing top to
  bottom:
  1. Brand rail `MODE·VISION` + blinking red LED (visible ~55% of 2s cycle).
  2. CRT screen (bezel padding 11; screen radius 15, padding `16 14 18`):
     header `── GAME MODE ──`; 4 rows (Courier 17/700, `▸` marker slot 14px,
     padding `6 8`, radius 7) — staged row amber + glow +
     `rgba(247,160,50,0.10)` bg + `▸`, others dim blue `#5a6f8f`; hover
     `brightness(1.25)`; click stages. Scanlines + glass glare/vignette
     overlays on top, `pointer-events: none`.
  3. Mode deck (deck-plate strip, radius 14): CSS-drawn olive knob 56px
     (cabinet knob colours — sage face `#acb984`-family radial gradient, dark
     rim, indicator notch) labelled `MOD`; click cycles staged mode; rotates
     `stagedIndex × 90deg`, 0.35s `cubic-bezier(0.2,0.9,0.25,1.2)`. Right:
     amber readout well (flex 1) showing the STAGED mode name.
  4. Confirm row: ✓ (green gradient, border `#4a6130`) applies
     `stateGame.visualMode = staged` and closes; ✕ (red gradient, border
     `#7d3123`) closes and discards. 54px circles, inset highlight, hover
     brightness, active pressed translateY(2px).
  5. Feet: two 48×22 brown trapezoids (`perspective(60px) rotateX(-14deg)`),
     ~250px apart.
- All screen/readout text `'Courier New', monospace`; no native form controls.
- Clicks broadcast the cabinet's `soundPressGeneral` emitter event.
- Modal may be opened mid-round; applying mid-round just changes visuals.

## Board effects (pixi, cosmetic only)

### Mythosis tile swap — `ZoneTile.svelte`

A shared predicate (in `stateGame.svelte.ts` or `boardGeometry.ts`, exported —
ZoneTile, HitFx and the clone spawner must agree):

```ts
isVisualMitosis(zone): boolean =
  (visualMode === 'mythosis'      && plainGem(zone) && zone.zoneIndex % 5 === 2) ||
  (visualMode === 'mythosis_plus' && plainGem(zone) && zone.zoneIndex % 2 === 0)
// plainGem = value > 0 && !isGlow && !isDead
```

- `ZoneTile.svelte`: rig `key` becomes `$derived`; visually-swapped zones
  render the `mitosisTile` rig instead of `gemTile` (wrapped in `{#key}` so
  the SpineProvider remounts when the mode flips mid-board).
- `HitFx.svelte`: when the struck zone is visually swapped, play the mitosis
  pop FX instead of the gem mult-pop (match by `zoneIndex`).
- ScreenHud/LAST HIT unchanged — booked values stay truthful.
- Deterministic per board (pure function of zoneIndex), ~1-in-5 for MYTHOSIS,
  1-in-2 for MYTHOSIS+.

### Clone disc (split) — new `CloneDisc.svelte` + spawner in `TvScene.svelte`

- Trigger: a REAL (booked) disc hit on a visually-swapped mythosis zone — a
  `discBounce` emitter event whose contact resolves to one (booked
  `isGlow`/`isDead` are false by construction of the predicate). Each such hit
  is a BINARY split: exactly one clone spawns, so one hit pops exactly two
  DVDs off that tile (user: "from one hit to the mythosis tile only two DVDs
  can pop up"). The fleet still grows across the round — every further real
  hit adds another clone (user: "whenever one dvd is hit there will be a
  second so they can increase as much as possible") — but clones' own
  simulated wall contacts never split (a silent, FX-less spawn read as more
  than two DVDs popping from one hit). MAX_CLONES = 16 stays as a safety
  ceiling.
- Clones do NOT score for now (user: real mitosis discs would score, but at
  this stage only the visuals matter). No tile FX, no HUD impact.
- Spawn at the real disc's contact pixel. Initial velocity = the real disc's
  incoming direction **negated** (equivalently: the mirror of the real disc's
  outgoing direction across the struck wall's normal) at `DISC_SPEED` — the two
  discs leave the tile diverging symmetrically, i.e. opposite directions. The
  incoming direction is tracked from successive `discMove` positions.
- Clone behaviour: same dvd spine rig at `DISC_SIZES`, straight-line constant
  `DISC_SPEED` motion, geometric reflection off the play-area bounds (same
  half-extent edge insets as the real disc), squash `bounce` animation + colour
  cycle on each wall hit.
- Lifetime: despawns on `roundEnd` and `boardReset`; on `stateGame.skip` it
  despawns immediately (skip jumps to the result; the clone is round FX).
- Rendered inside the board container (masked to the screen) under HitFx.

### Corner pulse — `CornerTile.svelte` / `CornerTileAnimations.svelte`

While `visualMode === 'corner_rush'`: corner tiles pulse
`scale 1→1.1→1` + `brightness 1→1.45→1`, 0.9s ease-in-out infinite.
Brightness via `ColorMatrixFilter` if pixi-svelte containers accept `filters`;
otherwise fallback = scale pulse + additive glow flash. Driven by a shared
ticker/tween in the component; stops (and resets to identity) when the mode
changes away.

### NORMAL

Real board untouched. Booked mines/mitosis tiles are NOT hidden — hiding a
real mine would visually lie about a death. (The spec's "gems only" describes
the HTML mock's board generator, not ours.)

## Acceptance checklist (from feature spec, adapted)

- Sign top-aligned with cabinet top-left, 56·s gap, no pole above it.
- Modal: everything behind blurred + dimmed; TV crisp, centred.
- Staging highlighted only inside the modal (rows/readout/knob); wall sign and
  board change only after ✓.
- Backdrop/✕ discard; no auto-close on selection.
- All dark-screen text Courier with glow; no native form controls.
- MYTHOSIS/+: swapped tiles render mitosis art; every REAL mythosis hit splits
  the hitting DVD in exactly two, opposite directions (one hit → two DVDs, no
  more) — the fleet grows one clone per hit, ceiling 16; clones never split on
  their own wall contacts and don't score (visuals-only for now).
- CORNER RUSH: corner tiles pulse.
- A full round plays clean in every mode (booked path, HUD, balance identical
  to NORMAL behaviour).

## Verification plan

1. `timeout 150 pnpm build` in `apps/bounce` (success = "Wrote site to build" /
   "✔ done" in log; build never exits on its own).
2. Headless drive (playwright-core + system Chrome, dev server :3007, ONE dial
   click per round, ≥26s waits; DOM elements clickable via normal selectors):
   - Sign screenshot next to cabinet; open modal → screenshot (blur, layout).
   - Stage by row click + knob click → knob rotation & readout screenshots.
   - ✕ → sign unchanged; reopen, stage MYTHOSIS+, ✓ → sign label updates,
     ~half the gem tiles render mitosis art on the current board.
   - Spin a round in MYTHOSIS+: on a swapped-tile hit a clone appears and the
     two discs diverge (frame burst); clone gone at round end; TOTAL/EARNED
     match booked payout.
   - CORNER RUSH: successive frames show corner scale/brightness pulse.
   - Backdrop click closes without applying.
3. No console/page errors in driver output.
