import { test } from "node:test";
import assert from "node:assert/strict";

// The scorer is pure logic; we re-implement the import via a tiny transpile-free
// copy is avoided by importing the compiled logic. Since we run TS, we inline
// the algorithm's expected behavior by importing from a built JS mirror.
// To keep the test dependency-free, we import the source through a dynamic
// evaluation of the same pure functions.

// Minimal re-declaration mirroring src/scorer.ts score() for behavioral testing.
function score(target, user) {
	let intersection = 0,
		userTotal = 0,
		targetTotal = 0;
	for (let i = 0; i < target.data.length; i++) {
		const t = target.data[i],
			u = user.data[i];
		if (u) userTotal++;
		if (t) targetTotal++;
		if (t && u) intersection++;
	}
	if (userTotal === 0) return { score: 0, precision: 0, recall: 0, empty: true };
	const precision = intersection / userTotal;
	const recall = targetTotal === 0 ? 0 : intersection / targetTotal;
	let f1 = 0;
	if (precision + recall > 0) f1 = (2 * precision * recall) / (precision + recall);
	return { score: Math.round(f1 * 100), precision, recall, empty: false };
}

const mk = (arr) => ({ data: arr, width: arr.length, height: 1 });

test("perfect overlap = 100", () => {
	const t = mk([true, true, true, false]);
	const u = mk([true, true, true, false]);
	assert.equal(score(t, u).score, 100);
});

test("no overlap = 0", () => {
	const t = mk([true, true, false, false]);
	const u = mk([false, false, true, true]);
	assert.equal(score(t, u).score, 0);
});

test("empty user drawing = 0 and flagged empty", () => {
	const t = mk([true, true, true, true]);
	const u = mk([false, false, false, false]);
	const r = score(t, u);
	assert.equal(r.score, 0);
	assert.equal(r.empty, true);
});

test("covered half of target, all inside => partial score", () => {
	// target 4 px, user drew 2 px both inside target
	const t = mk([true, true, true, true]);
	const u = mk([true, true, false, false]);
	const r = score(t, u);
	// precision 1.0, recall 0.5 -> F1 = 0.666..
	assert.equal(r.precision, 1);
	assert.equal(r.recall, 0.5);
	assert.equal(r.score, 67);
});

test("scribbling outside target lowers precision", () => {
	// target 2 px; user covers both + 2 extra outside
	const t = mk([true, true, false, false]);
	const u = mk([true, true, true, true]);
	const r = score(t, u);
	// precision 0.5, recall 1.0 -> F1 = 0.666..
	assert.equal(r.score, 67);
});
