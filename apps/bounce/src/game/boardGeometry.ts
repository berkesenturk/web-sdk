// Pure helpers mapping the book's normalized unit-square coordinates to board
// pixels. The math-sdk reflects the disc inside the unit square [0,1]^2 with
// contact points on the walls; the unit square maps onto the FULL board, so the
// book's 10 uniform 0.1 bins per wall land exactly on the 10-cell visual grid
// (corner square + 8 tiles + corner square, each ZONE_THICKNESS wide). Star
// grazes (fractions <0.1 / >=0.9) therefore land on the corner squares, and a
// booked tileIndex IS the visual tile — no folding or position-matching needed.
import { BOARD_SIZES, ZONE_THICKNESS } from './constants';
import type { PlayableTile, Vec2 } from './types';

export const LOGO_COLORS = [0xe50914, 0xff6b00, 0x00d26a, 0x00bfff, 0xa259ff, 0xff2d78];

export const fmtZoneVal = (value: number): string => {
	if (value >= 100) return Math.round(value).toString();
	if (value >= 1) return value.toFixed(1);
	return value.toFixed(2);
};

// Disc-centre pixel for a normalized unit-square point (0..1).
export const toPixel = (p: Vec2): Vec2 => ({
	x: p.x * BOARD_SIZES.width,
	y: p.y * BOARD_SIZES.height,
});

export type Rect = { x: number; y: number; w: number; h: number };

// Pixel rect of one playable wall tile (start/end are fractions of the wall,
// 0.1-wide bins → ZONE_THICKNESS-wide cells on the 10-cell grid).
export const tileRect = (tile: PlayableTile): Rect => {
	const t = ZONE_THICKNESS;
	const spanW = (tile.end - tile.start) * BOARD_SIZES.width;
	const spanH = (tile.end - tile.start) * BOARD_SIZES.height;
	switch (tile.wall) {
		case 'top':
			return { x: tile.start * BOARD_SIZES.width, y: 0, w: spanW, h: t };
		case 'bottom':
			return { x: tile.start * BOARD_SIZES.width, y: BOARD_SIZES.height - t, w: spanW, h: t };
		case 'left':
			return { x: 0, y: tile.start * BOARD_SIZES.height, w: t, h: spanH };
		case 'right':
			return { x: BOARD_SIZES.width - t, y: tile.start * BOARD_SIZES.height, w: t, h: spanH };
	}
};
