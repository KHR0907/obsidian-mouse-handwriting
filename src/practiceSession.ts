/**
 * PracticeSession — progress state for one practice sheet.
 *
 * Pure logic: tracks which cell you're on and the per-cell scores.
 * Serializes to/from the .penmanship file JSON. No Obsidian, no DOM.
 */

import { getSet, ProblemSet } from "./problemSets";

export interface SessionData {
	version: number;
	setId: string;
	mode: "scored" | "free";
	currentIndex: number;
	/** Per-cell score 0–100, or null if not yet attempted. */
	scores: (number | null)[];
}

export const FILE_VERSION = 1;

export class PracticeSession {
	readonly set: ProblemSet;
	mode: "scored" | "free";
	currentIndex: number;
	scores: (number | null)[];

	constructor(set: ProblemSet, mode: "scored" | "free" = "scored") {
		this.set = set;
		this.mode = mode;
		this.currentIndex = 0;
		this.scores = new Array(set.cells.length).fill(null);
	}

	get total(): number {
		return this.set.cells.length;
	}

	get currentCell(): string {
		return this.set.cells[this.currentIndex] ?? "";
	}

	recordScore(score: number) {
		if (this.currentIndex >= 0 && this.currentIndex < this.scores.length) {
			this.scores[this.currentIndex] = score;
		}
	}

	next(): boolean {
		if (this.currentIndex < this.total - 1) {
			this.currentIndex++;
			return true;
		}
		return false;
	}

	prev(): boolean {
		if (this.currentIndex > 0) {
			this.currentIndex--;
			return true;
		}
		return false;
	}

	/** True when every cell has a recorded score. */
	isComplete(): boolean {
		return this.scores.every((s) => s !== null);
	}

	/** Number of cells attempted. */
	attempted(): number {
		return this.scores.filter((s) => s !== null).length;
	}

	/** Average score over attempted cells, 0 if none attempted. */
	overall(): number {
		const done = this.scores.filter((s): s is number => s !== null);
		if (done.length === 0) return 0;
		const sum = done.reduce((a, b) => a + b, 0);
		return Math.round(sum / done.length);
	}

	reset() {
		this.currentIndex = 0;
		this.scores = new Array(this.total).fill(null);
	}

	toData(): SessionData {
		return {
			version: FILE_VERSION,
			setId: this.set.id,
			mode: this.mode,
			currentIndex: this.currentIndex,
			scores: this.scores,
		};
	}

	/**
	 * Restore a session from parsed file data. Returns null if the data is
	 * unusable (unknown set) so the caller can start fresh.
	 */
	static fromData(data: unknown): PracticeSession | null {
		if (!data || typeof data !== "object") return null;
		const d = data as Partial<SessionData>;
		if (typeof d.setId !== "string") return null;
		const set = getSet(d.setId);
		if (!set) return null;

		const s = new PracticeSession(set, d.mode === "free" ? "free" : "scored");
		if (
			Array.isArray(d.scores) &&
			d.scores.length === set.cells.length
		) {
			s.scores = d.scores.map((v) =>
				typeof v === "number" ? v : null
			);
		}
		if (
			typeof d.currentIndex === "number" &&
			d.currentIndex >= 0 &&
			d.currentIndex < set.cells.length
		) {
			s.currentIndex = d.currentIndex;
		}
		return s;
	}
}
