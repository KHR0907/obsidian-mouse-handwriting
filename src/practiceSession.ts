/**
 * PracticeSession — progress state for one practice sheet.
 *
 * Pure logic: tracks which cell you're on and which cells you've visited.
 * Free practice only — no scoring. Serializes to/from the .penmanship file
 * JSON. No Obsidian, no DOM.
 */

import { getSet, ProblemSet } from "./problemSets";

export interface SessionData {
	version: number;
	setId: string;
	currentIndex: number;
	/** Whether each cell has been visited. */
	visited: boolean[];
}

export const FILE_VERSION = 2;

export class PracticeSession {
	readonly set: ProblemSet;
	currentIndex: number;
	visited: boolean[];

	constructor(set: ProblemSet) {
		this.set = set;
		this.currentIndex = 0;
		this.visited = new Array(set.cells.length).fill(false);
		this.visited[0] = true;
	}

	get total(): number {
		return this.set.cells.length;
	}

	get currentCell(): string {
		return this.set.cells[this.currentIndex] ?? "";
	}

	private markVisited() {
		if (this.currentIndex >= 0 && this.currentIndex < this.visited.length) {
			this.visited[this.currentIndex] = true;
		}
	}

	next(): boolean {
		if (this.currentIndex < this.total - 1) {
			this.currentIndex++;
			this.markVisited();
			return true;
		}
		// Advancing past the last cell marks the sheet done.
		this.markVisited();
		return false;
	}

	prev(): boolean {
		if (this.currentIndex > 0) {
			this.currentIndex--;
			return true;
		}
		return false;
	}

	/** True when the last cell has been visited. */
	isComplete(): boolean {
		return this.visited[this.total - 1] === true;
	}

	reset() {
		this.currentIndex = 0;
		this.visited = new Array(this.total).fill(false);
		this.visited[0] = true;
	}

	toData(): SessionData {
		return {
			version: FILE_VERSION,
			setId: this.set.id,
			currentIndex: this.currentIndex,
			visited: this.visited,
		};
	}

	/**
	 * Restore a session from parsed file data. Returns null if the data is
	 * unusable (unknown set) so the caller can start fresh. Tolerates the older
	 * v1 format (which had per-cell scores) by ignoring the scores.
	 */
	static fromData(data: unknown): PracticeSession | null {
		if (!data || typeof data !== "object") return null;
		const d = data as Partial<SessionData> & { scores?: unknown[] };
		if (typeof d.setId !== "string") return null;
		const set = getSet(d.setId);
		if (!set) return null;

		const s = new PracticeSession(set);
		if (Array.isArray(d.visited) && d.visited.length === set.cells.length) {
			s.visited = d.visited.map((v) => v === true);
		} else if (Array.isArray(d.scores) && d.scores.length === set.cells.length) {
			// Migrate v1: a recorded score means that cell was visited.
			s.visited = d.scores.map((v) => typeof v === "number");
		}
		if (
			typeof d.currentIndex === "number" &&
			d.currentIndex >= 0 &&
			d.currentIndex < set.cells.length
		) {
			s.currentIndex = d.currentIndex;
			s.visited[d.currentIndex] = true;
		}
		return s;
	}
}
