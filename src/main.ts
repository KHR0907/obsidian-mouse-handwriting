import { Notice, Plugin, TFile, normalizePath } from "obsidian";
import { PenmanshipView, PENMANSHIP_VIEW_TYPE } from "./view";

export default class PenmanshipPlugin extends Plugin {
	async onload() {
		this.registerView(
			PENMANSHIP_VIEW_TYPE,
			(leaf) => new PenmanshipView(leaf)
		);

		// Open .penmanship files in our dedicated view.
		this.registerExtensions(["penmanship"], PENMANSHIP_VIEW_TYPE);

		this.addRibbonIcon("pencil", "새 따라쓰기 연습장", () => {
			this.createSheet();
		});

		this.addCommand({
			id: "new-penmanship-sheet",
			name: "새 따라쓰기 연습장 만들기",
			callback: () => this.createSheet(),
		});
	}

	/** Create a fresh, empty .penmanship file and open it (shows the set picker). */
	private async createSheet() {
		const folder =
			this.app.workspace.getActiveFile()?.parent?.path ?? "";
		const base = "따라쓰기 연습";
		let path = normalizePath(
			folder ? `${folder}/${base}.penmanship` : `${base}.penmanship`
		);
		let n = 1;
		while (this.app.vault.getAbstractFileByPath(path)) {
			n++;
			path = normalizePath(
				folder
					? `${folder}/${base} ${n}.penmanship`
					: `${base} ${n}.penmanship`
			);
		}

		try {
			// Empty content → view renders the set picker.
			const file = await this.app.vault.create(path, "");
			const leaf = this.app.workspace.getLeaf(true);
			await leaf.openFile(file as TFile);
		} catch (err) {
			console.error(err);
			new Notice("연습장 생성 실패: " + (err as Error).message);
		}
	}
}
