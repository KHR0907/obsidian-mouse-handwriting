import { test } from "node:test";
import assert from "node:assert/strict";

// Mirror of PracticeSession's pure visited-based logic for dependency-free tests.
// (src/practiceSession.ts is TS + imports Obsidian-free problemSets; we test the
// algorithm directly here.)

class Session {
	constructor(cells) {
		this.cells = cells;
		this.currentIndex = 0;
		this.visited = new Array(cells.length).fill(false);
		this.visited[0] = true;
	}
	get total() {
		return this.cells.length;
	}
	next() {
		if (this.currentIndex < this.total - 1) {
			this.currentIndex++;
			this.visited[this.currentIndex] = true;
			return true;
		}
		this.visited[this.currentIndex] = true;
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
		return this.visited[this.total - 1] === true;
	}
	reset() {
		this.currentIndex = 0;
		this.visited = new Array(this.total).fill(false);
		this.visited[0] = true;
	}
}

test("starts at first cell, first cell already visited, not complete", () => {
	const s = new Session(["a", "b", "c"]);
	assert.equal(s.currentIndex, 0);
	assert.equal(s.visited[0], true);
	assert.equal(s.isComplete(), false);
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

test("complete once the last cell is visited", () => {
	const s = new Session(["a", "b", "c"]);
	assert.equal(s.isComplete(), false);
	s.next();
	assert.equal(s.isComplete(), false);
	s.next();
	assert.equal(s.isComplete(), true);
});

test("finishing on the last cell (next returns false) marks complete", () => {
	const s = new Session(["only"]);
	// single-cell set: already on last cell
	assert.equal(s.next(), false);
	assert.equal(s.isComplete(), true);
});

test("reset clears visited except the first cell", () => {
	const s = new Session(["a", "b"]);
	s.next();
	assert.equal(s.isComplete(), true);
	s.reset();
	assert.equal(s.currentIndex, 0);
	assert.equal(s.isComplete(), false);
	assert.equal(s.visited[0], true);
});
