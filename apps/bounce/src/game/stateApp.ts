import { createApp } from 'pixi-svelte';

import assets from './assets';

// The board/disc/HUD render with Pixi primitives; the only bundled assets are the
// background art ported from the legacy game (see ./assets).
export const { stateApp } = createApp({ assets });
