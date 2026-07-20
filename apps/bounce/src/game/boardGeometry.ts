// Pure helpers mapping the book's normalized unit-square coordinates to board
// pixels. The math-sdk reflects the disc inside the unit square [0,1]^2 with
// contact points on the walls; we inset that square by the wall thickness so
// the disc centre touches the inner face of the struck band, and draw the 40
// zones as the surrounding frame.
import { BOARD_SIZES, ZONE_THICKNESS, VISUAL_TILES_PER_WALL } from './constants';
import type { Zone, Vec2, Wall, VisualMode } from './types';

export const LOGO_COLORS = [0xe50914, 0xff6b00, 0x00d26a, 0x00bfff, 0xa259ff, 0xff2d78];

// The board shows VISUAL_TILES_PER_WALL tiles per wall, but the books carry more
// zones per wall (10). We take the first N of each wall and spread them evenly
// across the band. The disc still travels to the book's true contact fraction, so
// hit feedback must be matched by POSITION (which visual tile the disc is over),
// NOT by zoneIndex — otherwise a different tile on the same wall animates.
export const toVisualZones = (zones: Zone[]): Zone[] => {
	const byWall = new Map<Wall, Zone[]>();
	for (const zone of zones) {
		const arr = byWall.get(zone.wall) ?? [];
		arr.push(zone);
		byWall.set(zone.wall, arr);
	}
	return [...byWall.values()].flatMap((wallZones) =>
		wallZones.slice(0, VISUAL_TILES_PER_WALL).map((zone, i) => ({
			...zone,
			start: i / VISUAL_TILES_PER_WALL,
			end: (i + 1) / VISUAL_TILES_PER_WALL,
		})),
	);
};

// Which wall a booked contact point sits on, and the 0..1 fraction along it. A
// bounce contact always has one coordinate exactly at 0 or 1.
export const contactWallFraction = (p: Vec2): { wall: Wall; fraction: number } | null => {
	const EPS = 1e-4;
	if (p.x <= EPS) return { wall: 'left', fraction: p.y };
	if (p.x >= 1 - EPS) return { wall: 'right', fraction: p.y };
	if (p.y <= EPS) return { wall: 'top', fraction: p.x };
	if (p.y >= 1 - EPS) return { wall: 'bottom', fraction: p.x };
	return null;
};

// The visual tile the disc is over at a contact point (the one that should react).
export const hitVisualZone = (zones: Zone[], p: Vec2): Zone | undefined => {
	const c = contactWallFraction(p);
	if (!c) return undefined;
	return toVisualZones(zones).find(
		(z) => z.wall === c.wall && c.fraction >= z.start && c.fraction < z.end,
	);
};

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

export const fmtZoneVal = (value: number): string => {
	if (value >= 100) return Math.round(value).toString();
	if (value >= 1) return value.toFixed(1);
	return value.toFixed(2);
};

const t = ZONE_THICKNESS;
// Inner play area = board inset by the wall thickness on all sides.
export const INNER = {
	width: BOARD_SIZES.width - 2 * t,
	height: BOARD_SIZES.height - 2 * t,
};

// Disc-centre pixel for a normalized unit-square point (0..1).
export const toPixel = (p: Vec2): Vec2 => ({
	x: t + p.x * INNER.width,
	y: t + p.y * INNER.height,
});

export type Rect = { x: number; y: number; w: number; h: number };

// Pixel rect of one wall zone band.
export const zoneRect = (zone: Zone): Rect => {
	const span = zone.end - zone.start;
	switch (zone.wall) {
		case 'top':
			return { x: t + zone.start * INNER.width, y: 0, w: span * INNER.width, h: t };
		case 'bottom':
			return {
				x: t + zone.start * INNER.width,
				y: BOARD_SIZES.height - t,
				w: span * INNER.width,
				h: t,
			};
		case 'left':
			return { x: 0, y: t + zone.start * INNER.height, w: t, h: span * INNER.height };
		case 'right':
			return {
				x: BOARD_SIZES.width - t,
				y: t + zone.start * INNER.height,
				w: t,
				h: span * INNER.height,
			};
	}
};
