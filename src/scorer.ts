/**
 * Scorer — pure scoring logic, independent of Obsidian and Canvas.
 *
 * Given a target-glyph mask and the user's drawing mask (both as boolean
 * coverage over the same pixel grid), computes an overlap accuracy score.
 *
 * The score is the F1 (harmonic mean) of:
 *   - precision: of the pixels the user drew, how many landed inside the target
 *   - recall:    of the target pixels, how many the user covered
 *
 * High precision  => the user stayed inside the target outline (mouse control).
 * High recall      => the user covered the target shape well (handwriting form).
 * F1 rewards doing both at once, which matches the plugin's two goals.
 */

export interface ScoreBreakdown {
	/** 0–100 overall accuracy. */
	score: number;
	/** 0–1, of drawn pixels how many were inside the target. */
	precision: number;
	/** 0–1, of target pixels how many were covered. */
	recall: number;
	/** True when the user drew nothing. */
	empty: boolean;
}

/**
 * Boolean coverage masks. `data[i]` is true when that pixel is "on".
 * Both masks must describe the same grid (same length).
 */
export interface Mask {
	data: boolean[];
	width: number;
	height: number;
}

/** Build a Mask from raw RGBA ImageData, treating any non-transparent pixel as "on". */
export function maskFromAlpha(
	pixels: Uint8ClampedArray,
	width: number,
	height: number,
	alphaThreshold = 16
): Mask {
	const data = new Array<boolean>(width * height);
	for (let i = 0; i < width * height; i++) {
		data[i] = pixels[i * 4 + 3] > alphaThreshold;
	}
	return { data, width, height };
}

/**
 * Score how well `user` overlaps `target`.
 *
 * @param target Coverage mask of the (slightly thickened) target glyph.
 * @param user   Coverage mask of the user's drawing.
 * @returns Breakdown with a 0–100 score.
 */
export function score(target: Mask, user: Mask): ScoreBreakdown {
	if (
		target.width !== user.width ||
		target.height !== user.height ||
		target.data.length !== user.data.length
	) {
		throw new Error("Scorer: target and user masks must share the same grid.");
	}

	let intersection = 0;
	let userTotal = 0;
	let targetTotal = 0;

	for (let i = 0; i < target.data.length; i++) {
		const t = target.data[i];
		const u = user.data[i];
		if (u) userTotal++;
		if (t) targetTotal++;
		if (t && u) intersection++;
	}

	if (userTotal === 0) {
		return { score: 0, precision: 0, recall: 0, empty: true };
	}

	const precision = intersection / userTotal;
	const recall = targetTotal === 0 ? 0 : intersection / targetTotal;

	let f1 = 0;
	if (precision + recall > 0) {
		f1 = (2 * precision * recall) / (precision + recall);
	}

	return {
		score: Math.round(f1 * 100),
		precision,
		recall,
		empty: false,
	};
}
