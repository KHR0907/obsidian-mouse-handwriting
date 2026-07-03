/**
 * PracticeBlock — renders a ```penmanship code block into a practice widget.
 *
 * Parses the block's YAML-ish body, builds a DrawingCanvas, wires the buttons,
 * and (in scored mode) scores the drawing and saves the result image + a line
 * back into the note.
 */

import {
	App,
	MarkdownPostProcessorContext,
	Notice,
	TFile,
	normalizePath,
} from "obsidian";
import { DrawingCanvas, GuideStyle } from "./drawingCanvas";
import { maskFromAlpha, score } from "./scorer";

export type PracticeMode = "scored" | "free";

export interface BlockConfig {
	target: string;
	mode: PracticeMode;
	guide: GuideStyle;
	size: number;
}

const DEFAULTS: BlockConfig = {
	target: "",
	mode: "scored",
	guide: "outline",
	size: 300,
};

/** Parse simple `key: value` lines from the code block body. */
export function parseConfig(source: string): BlockConfig {
	const cfg: BlockConfig = { ...DEFAULTS };
	for (const rawLine of source.split("\n")) {
		const line = rawLine.trim();
		if (!line || line.startsWith("#")) continue;
		const idx = line.indexOf(":");
		if (idx === -1) continue;
		const key = line.slice(0, idx).trim().toLowerCase();
		const value = line.slice(idx + 1).trim();
		switch (key) {
			case "target":
				cfg.target = value;
				break;
			case "mode":
				cfg.mode = value === "free" ? "free" : "scored";
				break;
			case "guide":
				if (value === "outline" || value === "filled" || value === "none") {
					cfg.guide = value;
				}
				break;
			case "size": {
				const n = parseInt(value, 10);
				if (!isNaN(n) && n >= 100 && n <= 800) cfg.size = n;
				break;
			}
		}
	}
	return cfg;
}

export function renderPracticeBlock(
	app: App,
	source: string,
	container: HTMLElement,
	ctx: MarkdownPostProcessorContext
) {
	const cfg = parseConfig(source);
	container.empty();
	container.addClass("penmanship-block");

	if (!cfg.target) {
		container.createEl("div", {
			cls: "penmanship-warning",
			text:
				'Penmanship: no target glyph set. Add a line like "target: A" inside the code block.',
		});
		return;
	}

	const canvasWrap = container.createDiv({ cls: "penmanship-canvas-wrap" });
	const canvas = new DrawingCanvas(canvasWrap, {
		target: cfg.target,
		guide: cfg.guide,
		size: cfg.size,
	});

	const result = container.createDiv({ cls: "penmanship-result" });

	const controls = container.createDiv({ cls: "penmanship-controls" });

	const clearBtn = controls.createEl("button", { text: "지우기" });
	clearBtn.onclick = () => {
		canvas.clear();
		result.setText("");
	};

	const undoBtn = controls.createEl("button", { text: "되돌리기" });
	undoBtn.onclick = () => canvas.undo();

	const guideBtn = controls.createEl("button", { text: "가이드 끄기" });
	let guideOn = cfg.guide !== "none";
	guideBtn.onclick = () => {
		guideOn = !guideOn;
		canvas.setGuide(guideOn ? cfg.guide === "none" ? "outline" : cfg.guide : "none");
		guideBtn.setText(guideOn ? "가이드 끄기" : "가이드 켜기");
	};

	const primaryLabel = cfg.mode === "scored" ? "채점 & 저장" : "이미지 저장";
	const saveBtn = controls.createEl("button", {
		text: primaryLabel,
		cls: "mod-cta",
	});
	saveBtn.onclick = async () => {
		if (canvas.isEmpty()) {
			result.setText("먼저 그려주세요.");
			return;
		}
		saveBtn.disabled = true;
		try {
			let scoreLine = "";
			if (cfg.mode === "scored") {
				const t = canvas.targetMaskPixels();
				const u = canvas.userMaskPixels();
				const tMask = maskFromAlpha(t.pixels, t.width, t.height);
				const uMask = maskFromAlpha(u.pixels, u.width, u.height);
				const s = score(tMask, uMask);
				result.setText(`정확도 ${s.score}%`);
				scoreLine = `정확도 **${s.score}%** · 목표 "${cfg.target}"`;
			}

			const blob = await canvas.toPngBlob();
			const savedPath = await saveImage(app, ctx, blob, cfg.target);
			await appendResult(app, ctx, savedPath, scoreLine);
			new Notice("연습 결과를 노트에 저장했습니다.");
		} catch (err) {
			console.error(err);
			new Notice("저장에 실패했습니다: " + (err as Error).message);
		} finally {
			saveBtn.disabled = false;
		}
	};
}

/** Save the PNG into the vault's attachment folder, return the vault path. */
async function saveImage(
	app: App,
	ctx: MarkdownPostProcessorContext,
	blob: Blob,
	target: string
): Promise<string> {
	const buf = await blob.arrayBuffer();
	const safeTarget = target.replace(/[^\p{L}\p{N}]/gu, "") || "glyph";
	// getAvailablePathForAttachments handles the user's configured attachment folder.
	const filename = `penmanship-${safeTarget}.png`;
	// @ts-ignore - available in Obsidian runtime; keeps us on the user's attachment settings.
	const path: string = await app.fileManager.getAvailablePathForAttachment(
		filename,
		ctx.sourcePath
	);
	await app.vault.createBinary(normalizePath(path), buf);
	return path;
}

/** Append an embed (and optional score line) to the note the block lives in. */
async function appendResult(
	app: App,
	ctx: MarkdownPostProcessorContext,
	imagePath: string,
	scoreLine: string
) {
	const file = app.vault.getAbstractFileByPath(ctx.sourcePath);
	if (!(file instanceof TFile)) return;

	const embedName = imagePath.split("/").pop() ?? imagePath;
	const stamp = new Date().toISOString().slice(0, 10);
	const parts = [`![[${embedName}]]`];
	if (scoreLine) parts.push(`${scoreLine} · ${stamp}`);
	const snippet = "\n\n" + parts.join("\n") + "\n";

	await app.vault.append(file, snippet);
}
