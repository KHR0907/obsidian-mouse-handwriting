import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Plugin,
	Setting,
} from "obsidian";
import { renderPracticeBlock, PracticeMode } from "./practiceBlock";

export default class PenmanshipPlugin extends Plugin {
	async onload() {
		this.registerMarkdownCodeBlockProcessor(
			"penmanship",
			(source, el, ctx) => {
				renderPracticeBlock(this.app, source, el, ctx);
			}
		);

		this.addRibbonIcon("pencil", "Penmanship Practice 삽입", () => {
			const view = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (!view) {
				new (require("obsidian").Notice)("마크다운 노트를 먼저 열어주세요.");
				return;
			}
			new InsertModal(this.app, (cfg) => {
				insertBlock(view.editor, cfg);
			}).open();
		});

		this.addCommand({
			id: "insert-penmanship-block",
			name: "Penmanship 연습 블록 삽입",
			editorCallback: (editor: Editor) => {
				new InsertModal(this.app, (cfg) => {
					insertBlock(editor, cfg);
				}).open();
			},
		});
	}
}

interface InsertConfig {
	target: string;
	mode: PracticeMode;
	guide: "outline" | "filled" | "none";
	size: number;
}

function insertBlock(editor: Editor, cfg: InsertConfig) {
	const block = [
		"```penmanship",
		`target: ${cfg.target}`,
		`mode: ${cfg.mode}`,
		`guide: ${cfg.guide}`,
		`size: ${cfg.size}`,
		"```",
		"",
	].join("\n");
	editor.replaceSelection(block);
}

class InsertModal extends Modal {
	private cfg: InsertConfig = {
		target: "",
		mode: "scored",
		guide: "outline",
		size: 300,
	};
	private onSubmit: (cfg: InsertConfig) => void;

	constructor(app: App, onSubmit: (cfg: InsertConfig) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h3", { text: "연습할 글자" });

		new Setting(contentEl)
			.setName("목표 글자")
			.setDesc("연습할 문자(알파벳·숫자·한글·한자 등)")
			.addText((t) =>
				t.setPlaceholder("예: A 또는 한").onChange((v) => (this.cfg.target = v))
			);

		new Setting(contentEl).setName("모드").addDropdown((d) =>
			d
				.addOption("scored", "채점 모드")
				.addOption("free", "자유 연습")
				.setValue(this.cfg.mode)
				.onChange((v) => (this.cfg.mode = v as PracticeMode))
		);

		new Setting(contentEl).setName("가이드").addDropdown((d) =>
			d
				.addOption("outline", "외곽선")
				.addOption("filled", "채움")
				.addOption("none", "없음")
				.setValue(this.cfg.guide)
				.onChange((v) => (this.cfg.guide = v as InsertConfig["guide"]))
		);

		new Setting(contentEl).setName("크기(px)").addText((t) =>
			t.setValue(String(this.cfg.size)).onChange((v) => {
				const n = parseInt(v, 10);
				if (!isNaN(n)) this.cfg.size = n;
			})
		);

		new Setting(contentEl).addButton((b) =>
			b
				.setButtonText("삽입")
				.setCta()
				.onClick(() => {
					if (!this.cfg.target.trim()) {
						b.setButtonText("글자를 입력하세요");
						return;
					}
					this.close();
					this.onSubmit(this.cfg);
				})
		);
	}

	onClose() {
		this.contentEl.empty();
	}
}
