/**
 * PracticeSession — progress state for one practice sheet.
 *
 * Pure logic: tracks which cell you're on and whether the sheet is finished.
 * Free practice only — no scoring. Serializes to/from the .penmanship file
 * JSON. No Obsidian, no DOM.
 */

import { getSet, ProblemSet } from "./problemSets";

export interface SessionData {
	version: number;
	setId: string;
	currentIndex: number;
	/** True once the user has finished the last cell. */
	finished: boolean;
}

export const FILE_VERSION = 3;

export class PracticeSession {
	readonly set: ProblemSet;
	currentIndex: number;
	/** Set true only when the user finishes the last cell ("완료" / Finish). */
	finished: boolean;

	constructor(set: ProblemSet) {
		this.set = set;
		this.currentIndex = 0;
		this.finished = false;
	}

	get total(): number {
		return this.set.cells.length;
	}

	get currentCell(): string {
		return this.set.cells[this.currentIndex] ?? "";
	}

	/**
	 * Advance to the next cell. On the last cell this finishes the sheet.
	 * Returns true if it moved to a new cell, false if it finished.
	 */
	next(): boolean {
		if (this.currentIndex < this.total - 1) {
			this.currentIndex++;
			return true;
		}
		this.finished = true;
		return false;
	}

	prev(): boolean {
		if (this.currentIndex > 0) {
			this.currentIndex--;
			return true;
		}
		return false;
	}

	/** True only after the user explicitly finishes the last cell. */
	isComplete(): boolean {
		return this.finished;
	}

	reset() {
		this.currentIndex = 0;
		this.finished = false;
	}

	toData(): SessionData {
		return {
			version: FILE_VERSION,
			setId: this.set.id,
			currentIndex: this.currentIndex,
			finished: this.finished,
		};
	}

	/**
	 * Restore a session from parsed file data. Returns null if the data is
	 * unusable (unknown set) so the caller can start fresh. Tolerates older
	 * formats (v1 scores, v2 visited) by ignoring their extra fields.
	 */
	static fromData(data: unknown): PracticeSession | null {
		if (!data || typeof data !== "object") return null;
		const d = data as Partial<SessionData>;
		if (typeof d.setId !== "string") return null;
		const set = getSet(d.setId);
		if (!set) return null;

		const s = new PracticeSession(set);
		if (
			typeof d.currentIndex === "number" &&
			d.currentIndex >= 0 &&
			d.currentIndex < set.cells.length
		) {
			s.currentIndex = d.currentIndex;
		}
		s.finished = d.finished === true;
		return s;
	}
}
