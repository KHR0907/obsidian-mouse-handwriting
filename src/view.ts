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
import {
	GLYPH_SETS,
	QUOTES,
	shortSetFromQuote,
	longSetFromQuote,
	ProblemSet,
} from "./problemSets";

export const PENMANSHIP_VIEW_TYPE = "penmanship-view";
export const CANVAS_SIZE = 340;
/** Wide canvas for tracing one line of a poem/song/novel. */
export const QUOTE_LINE_WIDTH = 600;
export const QUOTE_LINE_HEIGHT = 130;
/** Tall canvas for tracing a whole multi-line passage at once. */
export const QUOTE_FULL_WIDTH = 600;
export const QUOTE_FULL_HEIGHT = 460;

type MenuState = "root" | "quote-short" | "quote-long";

export class PenmanshipView extends TextFileView {
	private session: PracticeSession | null = null;
	private canvas: DrawingCanvas | null = null;
	/** Selected mode while navigating the picker menus. */
	private pendingMode: "scored" | "free" = "scored";
	/** Which picker screen is showing (only relevant when session is null). */
	private menu: MenuState = "root";

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
			// Empty / invalid file → let the user pick a set from the top menu.
			this.session = null;
			this.menu = "root";
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
		if (this.menu === "quote-short" || this.menu === "quote-long") {
			this.renderQuoteList(root, this.menu);
			return;
		}
		this.renderRootMenu(root);
	}

	/** Start a session from a chosen set and re-render. */
	private startSet(set: ProblemSet) {
		this.session = new PracticeSession(set, this.pendingMode);
		this.persist();
		this.render();
	}

	private renderModeRow(wrap: HTMLElement) {
		const modeRow = wrap.createDiv({ cls: "penmanship-mode-row" });
		modeRow.createSpan({ text: "모드: " });
		const scoredBtn = modeRow.createEl("button", { text: "채점" });
		const freeBtn = modeRow.createEl("button", { text: "자유" });
		const sync = () => {
			scoredBtn.toggleClass("mod-cta", this.pendingMode === "scored");
			freeBtn.toggleClass("mod-cta", this.pendingMode === "free");
		};
		scoredBtn.onclick = () => {
			this.pendingMode = "scored";
			sync();
		};
		freeBtn.onclick = () => {
			this.pendingMode = "free";
			sync();
		};
		sync();
	}

	private renderRootMenu(root: HTMLElement) {
		const wrap = root.createDiv({ cls: "penmanship-picker" });
		wrap.createEl("h2", { text: "따라쓰기 연습장" });
		wrap.createEl("p", {
			text: "연습할 종류를 고르세요.",
			cls: "penmanship-sub",
		});
		this.renderModeRow(wrap);

		const grid = wrap.createDiv({ cls: "penmanship-set-grid" });

		// Glyph / word sets — enter directly.
		for (const set of GLYPH_SETS) {
			const card = grid.createDiv({ cls: "penmanship-set-card" });
			card.createEl("div", { text: set.name, cls: "penmanship-set-name" });
			card.createEl("div", {
				text: `${set.cells.length}문제 · 예: ${set.cells.slice(0, 3).join(" ")}`,
				cls: "penmanship-set-meta",
			});
			card.onclick = () => this.startSet(set);
		}

		// Short-text: a poem/song/novel traced one line at a time.
		const shortCard = grid.createDiv({ cls: "penmanship-set-card" });
		shortCard.createEl("div", { text: "짧은 글 연습", cls: "penmanship-set-name" });
		shortCard.createEl("div", {
			text: "유명한 글귀를 한 줄씩 따라쓰기",
			cls: "penmanship-set-meta",
		});
		shortCard.onclick = () => {
			this.menu = "quote-short";
			this.render();
		};

		// Long-text: a whole passage traced at once.
		const longCard = grid.createDiv({ cls: "penmanship-set-card" });
		longCard.createEl("div", { text: "긴 글 연습", cls: "penmanship-set-name" });
		longCard.createEl("div", {
			text: "글귀 하나를 통째로 따라쓰기",
			cls: "penmanship-set-meta",
		});
		longCard.onclick = () => {
			this.menu = "quote-long";
			this.render();
		};
	}

	private renderQuoteList(root: HTMLElement, kind: "quote-short" | "quote-long") {
		const wrap = root.createDiv({ cls: "penmanship-picker" });

		const back = wrap.createEl("button", { text: "◀ 뒤로", cls: "penmanship-back" });
		back.onclick = () => {
			this.menu = "root";
			this.render();
		};

		wrap.createEl("h2", {
			text: kind === "quote-short" ? "짧은 글 연습" : "긴 글 연습",
		});
		wrap.createEl("p", {
			text:
				kind === "quote-short"
					? "글귀를 고르면 한 줄씩 따라 씁니다."
					: "글귀를 고르면 전체를 통째로 따라 씁니다.",
			cls: "penmanship-sub",
		});

		const grid = wrap.createDiv({ cls: "penmanship-set-grid" });
		for (const q of QUOTES) {
			const card = grid.createDiv({ cls: "penmanship-set-card" });
			card.createEl("div", { text: q.name, cls: "penmanship-set-name" });
			card.createEl("div", {
				text: `${q.lines.length}줄 · ${q.lines[0]}`,
				cls: "penmanship-set-meta",
			});
			card.onclick = () => {
				const set =
					kind === "quote-short"
						? shortSetFromQuote(q)
						: longSetFromQuote(q);
				this.startSet(set);
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

		const isShortQuote = s.set.kind === "quote-short";
		const isLongQuote = s.set.kind === "quote-long";

		// Attribution for quote sets (e.g. 윤동주 「서시」).
		if ((isShortQuote || isLongQuote) && s.set.source) {
			root.createEl("div", {
				text: s.set.source,
				cls: "penmanship-source",
			});
		}

		// Target label — the glyph/word/line to trace. For a whole passage the
		// text itself is on the canvas, so keep the label short.
		root.createEl("div", {
			text: isLongQuote ? "아래 글 전체를 따라 써보세요" : s.currentCell,
			cls: "penmanship-target-label",
		});

		// Canvas geometry: single line → wide; whole passage → tall; else square.
		const canvasWrap = root.createDiv({ cls: "penmanship-canvas-wrap" });
		let cw = CANVAS_SIZE;
		let ch = CANVAS_SIZE;
		if (isShortQuote) {
			cw = QUOTE_LINE_WIDTH;
			ch = QUOTE_LINE_HEIGHT;
		} else if (isLongQuote) {
			cw = QUOTE_FULL_WIDTH;
			ch = QUOTE_FULL_HEIGHT;
		}
		this.canvas = new DrawingCanvas(canvasWrap, {
			target: s.currentCell,
			guide: "outline",
			width: cw,
			height: ch,
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
			// Per-cell breakdown only makes sense with multiple cells.
			if (s.total > 1) {
				const summary = wrap.createDiv({ cls: "penmanship-summary" });
				s.set.cells.forEach((cell, i) => {
					const label = cell.replace(/\n/g, " ");
					const chip = summary.createDiv({ cls: "penmanship-chip" });
					chip.createSpan({
						text: label.length > 16 ? label.slice(0, 16) + "…" : label,
						cls: "penmanship-chip-cell",
					});
					chip.createSpan({
						text: `${s.scores[i] ?? 0}%`,
						cls: "penmanship-chip-score",
					});
				});
			}
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
