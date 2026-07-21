// Board topology + pixel geometry the renderer maps the normalized (0..1) book
// coordinates into. The legacy game used a 700x480 (3:2) board with the disc
// confined inside a wall band; these values keep that feel scaled up to the
// Stake main-layout sizes. The renderer (components/Board.svelte) is the single
// consumer and may refine the visual band, but the coordinate mapping
// ([0,1] -> [0,BOARD_SIZES]) is fixed here.

// 36 tiles per BOOK_CONTRACT.md: each wall is 10 uniform 0.1 bins — a corner
// (star) square at each end + 8 playable tiles between them.
export const TILE_COUNT = 36;

// Visual thickness of the wall tile band, in board pixels. Every tile is a
// perfect ZONE_THICKNESS square (see BOARD_SIZES).
export const ZONE_THICKNESS = 76;

// The play-field is a SQUARE with a 10-cell edge (2 corners + 8 tiles). The
// book reflects the disc in the unit square [0,1]^2 mapped onto the FULL board,
// so the 0.1 bins land exactly on the 10-cell grid and bounce angles stay true.
export const BOARD_SIZES = { width: 10 * ZONE_THICKNESS, height: 10 * ZONE_THICKNESS };

// Non-uniform widen factor for the TV cabinet. The cabinet is ONE sprite, so
// widening it also widens the square screen cutout — and since the board must
// stay square, any value > 1 leaves dark side bands between board and bezel.
// Keep at 1.0 for a flush fit; a truly wider TV needs new cabinet art with a
// wider bezel around a still-square hole. (Board math already compensates, so
// this stays safe to tune.)
export const TV_WIDEN = 1.0;

// --- Design-review mode -------------------------------------------------
// TEMPORARY toggle for deciding the visual design: hides the TV cabinet, blows
// the board up to fill the screen, and draws every component as a flat, distinct
// colour so the layout reads at a glance. Set to false to restore the real TV.
export const DESIGN_MODE = false;
export const DESIGN_COLORS = {
	playArea: 0x141b2e, // inner bounce area
	frame: 0xf5f5ff, // board outline
	corner: 0xff8c1a, // 4 corner (multiplier) zones
	gem: 0x2ec4b6, // value tile
	mine: 0xe63946, // dead tile
	mitosis: 0xb15cff, // glow tile
	disc: 0xff2d95, // the DVD disc
};

// Design size of the tile spine art (all three tile rigs author a 100x100
// rounded square centered on the skeleton root).
export const TILE_SOURCE_SIZE = 100;

// Uniform scale for the one-shot hit FX rigs (pops ~200px wide, explosion
// ~200px ring) drawn in board pixels at the contact point.
export const POP_SCALE = 1.5;

// Round-intro reveal wave: gem tiles flip question->gem staggered by tileIndex;
// the reveal book event awaits the whole wave (stagger span + the 0.63s reveal
// clip) before the first bounce launches. Turbo skips both.
export const REVEAL_STAGGER = 12;
export const REVEAL_WAVE_DURATION = 40 * REVEAL_STAGGER + 650;

// DVD-logo disc, in board pixels. The DVD spine rig's `plate` (the logo) is
// natively DISC_PLATE_NATIVE; we render it DISC_SIZES wide (same aspect), so the
// SpineProvider scale is DISC_SIZES.width / DISC_PLATE_NATIVE.width. The size also
// drives the edge-collision offset in Disc.svelte (disc bounces on its edge, not
// its centre), so keep width/height = the visible logo extent — the dvd-plate
// attachment is 200x111 rig units, but the badge art only fills 256x154 of its
// 460x256 texture region; the rest is transparent padding.
export const DISC_PLATE_NATIVE = { width: (256 / 460) * 200, height: (154 / 256) * 111 };
export const DISC_SIZES = {
	width: 80,
	height: (80 * DISC_PLATE_NATIVE.height) / DISC_PLATE_NATIVE.width, // 48, badge aspect
};

// Classic DVD-logo colour cycle: the plate tint steps to the next colour at
// every contact (wall bounce or corner). The plate art is near-white, so the
// multiplicative tint reads as the colour itself.
export const DISC_COLOR_CYCLE = [
	0x5ad7ff, 0x6dff8a, 0xffe14d, 0xffb84d, 0xff5a5a, 0xff7ad9, 0xb48aff,
];

// Retro-TV rig (Spine export) geometry, in rig pixels. The rig's root sits at
// the cabinet center (TvFrame shifts it by half these sizes so consumers keep
// addressing the TV as [0..width]x[0..height], y-down from top-left). The screen
// rect was measured pixel-exact from the cabinet art's dark cutout — the new
// design has a SQUARE screen, so the square board fills it edge to edge.
export const TV_RIG_SIZES = { width: 530, height: 646 };
export const TV_SCREEN_RECT = { x: 24, y: 41, width: 482, height: 482 };

// The TV fits the whole canvas; the control row overlays the cabinet bottom
// as a translucent strip this fraction of the window height tall.
export const CONTROL_BAND_RATIO = 0.08;

// Disc travel speed in board pixels/ms, and the per-bounce duration clamp. The
// disc moves at a constant DVD speed between booked contact points; turbo scales
// the duration down. min is only a teleport guard: corner-graze hops are tiny
// (~30 board px after edge insets) and must stay QUICK — a bigger floor
// stretches them into a visible crawl (~6x under speed at the old 240).
export const DISC_SPEED = 0.8;
export const DISC_DURATION = { min: 40, max: 1800 };
