import { test } from "node:test";
import assert from "node:assert/strict";

// Mirror of PracticeSession's pure logic for dependency-free behavioral tests.
// (src/practiceSession.ts is TS + imports Obsidian-free problemSets; we test the
// algorithm directly here.)

class Session {
	constructor(cells, mode = "scored") {
		this.cells = cells;
		this.mode = mode;
		this.currentIndex = 0;
		this.scores = new Array(cells.length).fill(null);
	}
	get total() {
		return this.cells.length;
	}
	recordScore(sc) {
		this.scores[this.currentIndex] = sc;
	}
	next() {
		if (this.currentIndex < this.total - 1) {
			this.currentIndex++;
			return true;
		}
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
		return this.scores.every((s) => s !== null);
	}
	overall() {
		const done = this.scores.filter((s) => s !== null);
		if (!done.length) return 0;
		return Math.round(done.reduce((a, b) => a + b, 0) / done.length);
	}
	reset() {
		this.currentIndex = 0;
		this.scores = new Array(this.total).fill(null);
	}
}

test("starts at first cell, nothing complete", () => {
	const s = new Session(["a", "b", "c"]);
	assert.equal(s.currentIndex, 0);
	assert.equal(s.isComplete(), false);
	assert.equal(s.overall(), 0);
});

test("advances and stops at last cell", () => {
	const s = new Session(["a", "b"]);
	assert.equal(s.next(), true);
	assert.equal(s.currentIndex, 1);
	assert.equal(s.next(), false); // no move past last
	assert.equal(s.currentIndex, 1);
});

test("prev stops at first cell", () => {
	const s = new Session(["a", "b"]);
	assert.equal(s.prev(), false);
	assert.equal(s.currentIndex, 0);
});

test("records scores per cell and computes average", () => {
	const s = new Session(["a", "b", "c"]);
	s.recordScore(90);
	s.next();
	s.recordScore(80);
	s.next();
	s.recordScore(70);
	assert.equal(s.isComplete(), true);
	assert.equal(s.overall(), 80);
});

test("average ignores unattempted cells", () => {
	const s = new Session(["a", "b", "c", "d"]);
	s.recordScore(100);
	s.next();
	s.recordScore(50);
	// only 2 of 4 attempted
	assert.equal(s.overall(), 75);
	assert.equal(s.isComplete(), false);
});

test("reset clears progress", () => {
	const s = new Session(["a", "b"]);
	s.recordScore(90);
	s.next();
	s.recordScore(90);
	s.reset();
	assert.equal(s.currentIndex, 0);
	assert.equal(s.isComplete(), false);
	assert.equal(s.overall(), 0);
});
