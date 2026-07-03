/**
 * PenmanshipView — the dedicated full-page practice view for .penmanship files.
 *
 * Renders the "따라쓰기 연습장": a problem-set header with progress, the current
 * cell's target as a canvas guide, drawing controls, and a completion screen.
 * Reads/writes the .penmanship file (JSON session state).
 */

import { TextFileView, WorkspaceLeaf } from "obsidian";
import { DrawingCanvas } from "./drawingCanvas";
import { maskFromAlpha, score } from "./scorer";
import { PracticeSession } from "./practiceSession";
import { BUILTIN_SETS } from "./problemSets";

export const PENMANSHIP_VIEW_TYPE = "penmanship-view";
export const CANVAS_SIZE = 340;

export class PenmanshipView extends TextFileView {
	private session: PracticeSession | null = null;
	private canvas: DrawingCanvas | null = null;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType(): string {
		return PENMANSHIP_VIEW_TYPE;
	}

	getDisplayText(): string {
		return this.file?.basename ?? "Penmanship";
	}

	getIcon(): string {
		return "pencil";
	}

	/** TextFileView calls this with the file's raw string content. */
	setViewData(data: string): void {
		let parsed: unknown = null;
		try {
			parsed = data.trim() ? JSON.parse(data) : null;
		} catch {
			parsed = null;
		}
		this.session = PracticeSession.fromData(parsed);
		if (!this.session) {
			// Empty / invalid file → let the user pick a set.
			this.session = null;
		}
		this.render();
	}

	/** TextFileView asks for the string to write back to the file. */
	getViewData(): string {
		if (!this.session) return "";
		return JSON.stringify(this.session.toData(), null, 2);
	}

	clear(): void {
		this.session = null;
		this.canvas = null;
	}

	private persist() {
		// Mark the file dirty so Obsidian saves getViewData().
		this.requestSave();
	}

	// ---- rendering ------------------------------------------------------

	private render() {
		const root = this.contentEl;
		root.empty();
		root.addClass("penmanship-view");

		if (!this.session) {
			this.renderSetPicker(root);
			return;
		}
		if (this.session.isComplete()) {
			this.renderComplete(root);
			return;
		}
		this.renderPractice(root);
	}

	private renderSetPicker(root: HTMLElement) {
		const wrap = root.createDiv({ cls: "penmanship-picker" });
		wrap.createEl("h2", { text: "따라쓰기 연습장" });
		wrap.createEl("p", {
			text: "연습할 문제 세트를 고르세요.",
			cls: "penmanship-sub",
		});

		const modeRow = wrap.createDiv({ cls: "penmanship-mode-row" });
		modeRow.createSpan({ text: "모드: " });
		let mode: "scored" | "free" = "scored";
		const scoredBtn = modeRow.createEl("button", {
			text: "채점",
			cls: "mod-cta",
		});
		const freeBtn = modeRow.createEl("button", { text: "자유" });
		const syncMode = () => {
			scoredBtn.toggleClass("mod-cta", mode === "scored");
			freeBtn.toggleClass("mod-cta", mode === "free");
		};
		scoredBtn.onclick = () => {
			mode = "scored";
			syncMode();
		};
		freeBtn.onclick = () => {
			mode = "free";
			syncMode();
		};

		const grid = wrap.createDiv({ cls: "penmanship-set-grid" });
		for (const set of BUILTIN_SETS) {
			const card = grid.createDiv({ cls: "penmanship-set-card" });
			card.createEl("div", { text: set.name, cls: "penmanship-set-name" });
			card.createEl("div", {
				text: `${set.cells.length}문제 · 예: ${set.cells.slice(0, 3).join(" ")}`,
				cls: "penmanship-set-meta",
			});
			card.onclick = () => {
				this.session = new PracticeSession(set, mode);
				this.persist();
				this.render();
			};
		}
	}

	private renderPractice(root: HTMLElement) {
		const s = this.session!;
		const header = root.createDiv({ cls: "penmanship-header" });
		header.createEl("div", { text: s.set.name, cls: "penmanship-title" });

		const prog = header.createDiv({ cls: "penmanship-progress" });
		prog.createSpan({
			text: `${s.currentIndex + 1} / ${s.total}`,
			cls: "penmanship-progress-count",
		});
		if (s.mode === "scored") {
			prog.createSpan({
				text: `평균 ${s.overall()}%`,
				cls: "penmanship-progress-score",
			});
		}
		const bar = header.createDiv({ cls: "penmanship-bar" });
		const fill = bar.createDiv({ cls: "penmanship-bar-fill" });
		fill.style.width = `${((s.currentIndex) / s.total) * 100}%`;

		// Target label
		root.createEl("div", {
			text: s.currentCell,
			cls: "penmanship-target-label",
		});

		// Canvas
		const canvasWrap = root.createDiv({ cls: "penmanship-canvas-wrap" });
		this.canvas = new DrawingCanvas(canvasWrap, {
			target: s.currentCell,
			guide: "outline",
			size: CANVAS_SIZE,
		});

		const result = root.createDiv({ cls: "penmanship-result" });
		const prev = s.scores[s.currentIndex];
		if (prev !== null && s.mode === "scored") {
			result.setText(`이전 점수 ${prev}%`);
		}

		// Controls
		const controls = root.createDiv({ cls: "penmanship-controls" });

		const clearBtn = controls.createEl("button", { text: "지우기" });
		clearBtn.onclick = () => {
			this.canvas?.clear();
			result.setText("");
		};

		const undoBtn = controls.createEl("button", { text: "되돌리기" });
		undoBtn.onclick = () => this.canvas?.undo();

		let guideOn = true;
		const guideBtn = controls.createEl("button", { text: "가이드 끄기" });
		guideBtn.onclick = () => {
			guideOn = !guideOn;
			this.canvas?.setGuide(guideOn ? "outline" : "none");
			guideBtn.setText(guideOn ? "가이드 끄기" : "가이드 켜기");
		};

		if (s.currentIndex > 0) {
			const prevBtn = controls.createEl("button", { text: "◀ 이전" });
			prevBtn.onclick = () => {
				s.prev();
				this.persist();
				this.render();
			};
		}

		const nextLabel =
			s.mode === "scored"
				? s.currentIndex === s.total - 1
					? "채점 & 완료"
					: "채점 & 다음 ▶"
				: s.currentIndex === s.total - 1
					? "완료"
					: "다음 ▶";
		const nextBtn = controls.createEl("button", {
			text: nextLabel,
			cls: "mod-cta",
		});
		nextBtn.onclick = () => {
			if (s.mode === "scored") {
				if (!this.canvas || this.canvas.isEmpty()) {
					result.setText("먼저 써주세요.");
					return;
				}
				const t = this.canvas.targetMaskPixels();
				const u = this.canvas.userMaskPixels();
				const sc = score(
					maskFromAlpha(t.pixels, t.width, t.height),
					maskFromAlpha(u.pixels, u.width, u.height)
				);
				s.recordScore(sc.score);
			} else {
				// free mode: mark as visited with score 0 placeholder so progress advances
				s.recordScore(s.scores[s.currentIndex] ?? 0);
			}
			const moved = s.next();
			this.persist();
			if (!moved) {
				// last cell just recorded
				this.render();
			} else {
				this.render();
			}
		};
	}

	private renderComplete(root: HTMLElement) {
		const s = this.session!;
		const wrap = root.createDiv({ cls: "penmanship-complete" });
		wrap.createEl("h2", { text: "연습 완료! 🎉" });
		wrap.createEl("div", { text: s.set.name, cls: "penmanship-sub" });

		if (s.mode === "scored") {
			wrap.createEl("div", {
				text: `전체 평균 정확도 ${s.overall()}%`,
				cls: "penmanship-complete-score",
			});
			const summary = wrap.createDiv({ cls: "penmanship-summary" });
			s.set.cells.forEach((cell, i) => {
				const chip = summary.createDiv({ cls: "penmanship-chip" });
				chip.createSpan({ text: cell, cls: "penmanship-chip-cell" });
				chip.createSpan({
					text: `${s.scores[i] ?? 0}%`,
					cls: "penmanship-chip-score",
				});
			});
		}

		const controls = wrap.createDiv({ cls: "penmanship-controls" });
		const again = controls.createEl("button", {
			text: "다시하기",
			cls: "mod-cta",
		});
		again.onclick = () => {
			s.reset();
			this.persist();
			this.render();
		};
		const other = controls.createEl("button", { text: "다른 세트" });
		other.onclick = () => {
			this.session = null;
			this.persist();
			this.render();
		};
	}
}
