import { test } from "node:test";
import assert from "node:assert/strict";

// Mirror of PracticeSession's pure logic for dependency-free tests.
// (src/practiceSession.ts is TS + imports Obsidian-free problemSets; we test the
// algorithm directly here.)

class Session {
	constructor(cells) {
		this.cells = cells;
		this.currentIndex = 0;
		this.finished = false;
	}
	get total() {
		return this.cells.length;
	}
	next() {
		if (this.currentIndex < this.total - 1) {
			this.currentIndex++;
			return true;
		}
		this.finished = true;
		return false;
	}
	prev() {
		if (this.currentIndex > 0) {
			this.currentIndex--;
			return true;
		}
		return false;
	}
	isComplete() {
		return this.finished;
	}
	reset() {
		this.currentIndex = 0;
		this.finished = false;
	}
}

test("starts at first cell, not complete", () => {
	const s = new Session(["a", "b", "c"]);
	assert.equal(s.currentIndex, 0);
	assert.equal(s.isComplete(), false);
});

test("single-cell set is NOT complete on open (regression: long-text)", () => {
	const s = new Session(["whole poem"]);
	assert.equal(s.isComplete(), false);
});

test("single-cell set completes only after pressing finish", () => {
	const s = new Session(["whole poem"]);
	assert.equal(s.next(), false); // pressing 완료 on the only cell
	assert.equal(s.isComplete(), true);
});

test("advances and stops at last cell", () => {
	const s = new Session(["a", "b"]);
	assert.equal(s.next(), true);
	assert.equal(s.currentIndex, 1);
	assert.equal(s.isComplete(), false); // reached last cell but not finished yet
	assert.equal(s.next(), false); // finish
	assert.equal(s.isComplete(), true);
});

test("prev stops at first cell and does not finish", () => {
	const s = new Session(["a", "b"]);
	assert.equal(s.prev(), false);
	assert.equal(s.currentIndex, 0);
	assert.equal(s.isComplete(), false);
});

test("reset clears progress and finished flag", () => {
	const s = new Session(["a", "b"]);
	s.next();
	s.next();
	assert.equal(s.isComplete(), true);
	s.reset();
	assert.equal(s.currentIndex, 0);
	assert.equal(s.isComplete(), false);
});
