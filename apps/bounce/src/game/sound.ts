import { createSound } from 'utils-sound';

// Minimal sound vocabulary. No audio assets are bundled yet, so createSound is a
// silent no-op until a sound atlas is added; the names keep the emitter typed.
export type MusicName = 'bgm_main';

export type SoundEffectName = 'sfx_bounce' | 'sfx_corner' | 'sfx_chain' | 'sfx_btn_general';

export type SoundName = MusicName | SoundEffectName;

const sound = createSound<SoundName>();

export { sound };
