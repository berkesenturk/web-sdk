import { TV_RIG_SIZES, TV_WIDEN } from './constants';

// Where the TV cabinet lands on the canvas. Shared because the cabinet menu is
// drawn in a separate layer (above the SDK UI) and must line up with the rig
// rendered inside TvScene. The cabinet is stretched TV_WIDEN in x; consumers
// apply scale {x: scale * TV_WIDEN, y: scale}.
//
// The cabinet art has transparent padding inside its 646-tall rig: the visible
// cabinet (top trim down to the feet) spans rig y ≈ 10..623. We fit THAT content
// to the canvas — not the padded rig box — so the feet sit on the bottom edge
// with no dead gap, scaling uniformly so the square screen stays square.
const CABINET_TOP = 10;
const CABINET_BOTTOM = 623;
const CABINET_CONTENT_HEIGHT = CABINET_BOTTOM - CABINET_TOP;

export const tvTransform = (canvas: { width: number; height: number }) => {
	const scale = Math.min(
		canvas.width / (TV_RIG_SIZES.width * TV_WIDEN),
		canvas.height / CABINET_CONTENT_HEIGHT,
	);
	return {
		scale,
		x: (canvas.width - TV_RIG_SIZES.width * TV_WIDEN * scale) / 2,
		// Anchor the feet (content bottom) to the canvas bottom.
		y: canvas.height - CABINET_BOTTOM * scale,
	};
};
