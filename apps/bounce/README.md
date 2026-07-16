# Bounce — build & run

Bounce is a SvelteKit + PixiJS (pixi-svelte / Spine) game app inside the Stake `web-sdk`
pnpm workspace. Everything below runs from the **workspace root** (`web-sdk/`) unless
noted; `-F bounce` targets this app.

## Prerequisites

- Node >= 22.16 (repo `engines`), pnpm 10 (`packageManager: pnpm@10.5.0`)
- For local play in dev: the math-sdk publish files at
  `../math-sdk/games/bounce/library/publish_files` (sibling of `web-sdk/`). The dev-only
  mock RGS (`mock-rgs/plugin.js`) samples real books from there. Not needed for `vite build`.

## Install

```sh
pnpm install
```

If dependency versions changed (pulls, pin edits), pnpm does **not** prune stale package
dirs reliably — when the game misbehaves after an install, do a clean reinstall and clear
Vite's prebundle cache:

```sh
rm -rf node_modules apps/bounce/node_modules/.vite
pnpm install
```

## Dev server

```sh
pnpm -F bounce dev   # https://localhost:3007 (self-signed cert)
```

Open with the query params the SDK expects (the mock RGS is served same-origin):

```
https://localhost:3007/?rgs_url=localhost:3007&sessionID=mock&currency=USD&device=desktop&lang=en
```

Replay mode (renders a booked round, replay UI instead of the betting bar) — append:

```
&replay=true&game=bounce&mode=normal&amount=1&event=3
```

**Restart the dev server after any dependency change.** A running server keeps the old
Vite optimizer `browserHash` in memory and serves dep chunks pinned to the old
`?v=<hash>`, which browsers cache as immutable — reloading the page does not help until
the server restarts.

## Production build

```sh
pnpm -F bounce build
```

Output is a static site in `apps/bounce/build/` (`@sveltejs/adapter-static`). Success
marker in the log is `✔ done`. Known quirk (WSL at least): the process **completes but
never exits** — a sass-embedded child keeps it alive. Once `✔ done` is printed it is safe
to Ctrl+C (or `pkill -f "vite.js build"`).

`vite build` is also the type/template gate for this app — there is no `svelte-check`
script; a clean build is the verification that the Svelte/TS code compiles.

To serve the built output:

```sh
pnpm -F bounce preview
```

## Lint / format / storybook

```sh
pnpm -F bounce lint
pnpm -F bounce format
pnpm -F bounce storybook   # port 6007
```

## Assets (Spine rigs)

Spine 4.2 exports live in `static/assets/spines/<rig>/` (`.atlas` + `.json` + `.png`),
referenced by `src/game/assets.ts`. Swap rules for new exports from the designer:

- Keep the exact filenames; drop the files in place. No code change needed. (If the
  designer renames files/folders, update the paths in `src/game/assets.ts` to match.)
- Higher-resolution re-exports are fine as long as the skeleton `.json` stays the same
  and atlas **region names** match — quad sizes come from the skeleton, so bigger
  textures render at the same size, just crisper (the tile/pop/explosion rigs are 4×).
- Static files are not part of Vite's dep optimizer: no server restart needed, but
  hard-reload the browser (Ctrl+Shift+R) to drop cached PNGs.

## Workspace gotchas

- **Spine version alignment (silent total failure):** `@esotericsoftware/spine-pixi-v8`
  imports `spine-core` without declaring it. Every `@esotericsoftware/*` pin in the
  workspace (see `packages/pixi-svelte/package.json`) must match spine-pixi-v8's own
  version (currently 4.2.119). Two spine-core copies in the bundle make `instanceof`
  checks in the render pipe fail and **nothing spine renders, with no error**.
- **pixi-svelte resolves to its built `dist/`** (package `exports`), not `src/`. After
  editing `packages/pixi-svelte`, run `pnpm -F pixi-svelte build` or the app won't see
  the change.
