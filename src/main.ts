import {
	App,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	normalizePath,
} from "obsidian";
import { PenmanshipView, PENMANSHIP_VIEW_TYPE } from "./view";
import { Lang, LANGS, DEFAULT_LANG, strings } from "./i18n";

interface PenmanshipSettings {
	lang: Lang;
}

const DEFAULT_SETTINGS: PenmanshipSettings = {
	lang: DEFAULT_LANG,
};

export default class PenmanshipPlugin extends Plugin {
	settings: PenmanshipSettings = { ...DEFAULT_SETTINGS };

	async onload() {
		await this.loadSettings();

		this.registerView(
			PENMANSHIP_VIEW_TYPE,
			(leaf) => new PenmanshipView(leaf, () => this.settings.lang)
		);

		// Open .penmanship files in our dedicated view.
		this.registerExtensions(["penmanship"], PENMANSHIP_VIEW_TYPE);

		this.addRibbonIcon(
			"pencil",
			strings(this.settings.lang).newSheet,
			() => this.createSheet()
		);

		this.addCommand({
			id: "new-penmanship-sheet",
			name: strings(this.settings.lang).newSheetCommand,
			callback: () => this.createSheet(),
		});

		this.addSettingTab(new PenmanshipSettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/** Re-render every open Penmanship view (e.g. after a language change). */
	refreshViews() {
		this.app.workspace
			.getLeavesOfType(PENMANSHIP_VIEW_TYPE)
			.forEach((leaf) => {
				const view = leaf.view;
				if (view instanceof PenmanshipView) view.rerender();
			});
	}

	/** Create a fresh, empty .penmanship file and open it (shows the set picker). */
	private async createSheet() {
		const s = strings(this.settings.lang);
		const folder = this.app.workspace.getActiveFile()?.parent?.path ?? "";
		const base = s.newSheetFilename;
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
			new Notice(s.createFailed + (err as Error).message);
		}
	}
}

class PenmanshipSettingTab extends PluginSettingTab {
	plugin: PenmanshipPlugin;

	constructor(app: App, plugin: PenmanshipPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Language / 언어 / 言語")
			.setDesc("UI language and default content.")
			.addDropdown((d) => {
				for (const l of LANGS) d.addOption(l.id, l.label);
				d.setValue(this.plugin.settings.lang).onChange(async (v) => {
					this.plugin.settings.lang = v as Lang;
					await this.plugin.saveSettings();
					this.plugin.refreshViews();
				});
			});
	}
}
