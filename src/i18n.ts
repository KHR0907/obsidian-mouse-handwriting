/**
 * i18n — UI translations for Korean / English / Japanese.
 *
 * Pure data + a tiny lookup. No Obsidian, no DOM.
 * Every user-facing string in the plugin goes through `t(lang, key)`.
 */

export type Lang = "ko" | "en" | "ja";

export const LANGS: { id: Lang; label: string }[] = [
	{ id: "ko", label: "한국어" },
	{ id: "en", label: "English" },
	{ id: "ja", label: "日本語" },
];

export const DEFAULT_LANG: Lang = "ko";

/** Keys for every translatable string. */
export interface Strings {
	appTitle: string;
	pickKind: string;
	practiceLang: string; // label for the content-language dropdown
	shortPractice: string;
	shortPracticeDesc: string;
	longPractice: string;
	longPracticeDesc: string;
	pickQuoteShort: string;
	pickQuoteLong: string;
	back: string;
	problems: string; // "N problems"
	lines: string; // "N lines"
	example: string; // "e.g."
	traceWhole: string; // long-quote label
	guideOff: string;
	guideOn: string;
	clear: string;
	undo: string;
	prev: string;
	next: string;
	finish: string;
	complete: string;
	again: string;
	otherSet: string;
	newSheet: string;
	newSheetCommand: string;
	newSheetFilename: string;
	createFailed: string;
}

const KO: Strings = {
	appTitle: "따라쓰기 연습장",
	pickKind: "연습할 종류를 고르세요.",
	practiceLang: "연습 언어",
	shortPractice: "짧은 글 연습",
	shortPracticeDesc: "유명한 글귀를 한 줄씩 따라쓰기",
	longPractice: "긴 글 연습",
	longPracticeDesc: "글귀 하나를 통째로 따라쓰기",
	pickQuoteShort: "글귀를 고르면 한 줄씩 따라 씁니다.",
	pickQuoteLong: "글귀를 고르면 전체를 통째로 따라 씁니다.",
	back: "◀ 뒤로",
	problems: "문제",
	lines: "줄",
	example: "예",
	traceWhole: "아래 글 전체를 따라 써보세요",
	guideOff: "가이드 끄기",
	guideOn: "가이드 켜기",
	clear: "지우기",
	undo: "되돌리기",
	prev: "◀ 이전",
	next: "다음 ▶",
	finish: "완료",
	complete: "연습 완료! 🎉",
	again: "다시하기",
	otherSet: "다른 세트",
	newSheet: "새 따라쓰기 연습장",
	newSheetCommand: "새 따라쓰기 연습장 만들기",
	newSheetFilename: "따라쓰기 연습",
	createFailed: "연습장 생성 실패: ",
};

const EN: Strings = {
	appTitle: "Penmanship Practice",
	pickKind: "Choose what to practice.",
	practiceLang: "Practice language",
	shortPractice: "Short Text",
	shortPracticeDesc: "Trace a famous passage line by line",
	longPractice: "Long Text",
	longPracticeDesc: "Trace a whole passage at once",
	pickQuoteShort: "Pick a passage to trace one line at a time.",
	pickQuoteLong: "Pick a passage to trace all at once.",
	back: "◀ Back",
	problems: "problems",
	lines: "lines",
	example: "e.g.",
	traceWhole: "Trace the whole passage below",
	guideOff: "Hide guide",
	guideOn: "Show guide",
	clear: "Clear",
	undo: "Undo",
	prev: "◀ Prev",
	next: "Next ▶",
	finish: "Finish",
	complete: "Practice complete! 🎉",
	again: "Retry",
	otherSet: "Other set",
	newSheet: "New penmanship sheet",
	newSheetCommand: "Create new penmanship sheet",
	newSheetFilename: "Penmanship Practice",
	createFailed: "Failed to create sheet: ",
};

const JA: Strings = {
	appTitle: "なぞり書き練習帳",
	pickKind: "練習する種類を選んでください。",
	practiceLang: "練習する言語",
	shortPractice: "短文の練習",
	shortPracticeDesc: "有名な文章を一行ずつなぞる",
	longPractice: "長文の練習",
	longPracticeDesc: "文章をまるごとなぞる",
	pickQuoteShort: "文章を選ぶと一行ずつなぞります。",
	pickQuoteLong: "文章を選ぶと全体をまるごとなぞります。",
	back: "◀ 戻る",
	problems: "問",
	lines: "行",
	example: "例",
	traceWhole: "下の文章全体をなぞってください",
	guideOff: "ガイドを隠す",
	guideOn: "ガイドを表示",
	clear: "消去",
	undo: "元に戻す",
	prev: "◀ 前へ",
	next: "次へ ▶",
	finish: "完了",
	complete: "練習完了！🎉",
	again: "もう一度",
	otherSet: "他のセット",
	newSheet: "新しいなぞり書き練習帳",
	newSheetCommand: "新しいなぞり書き練習帳を作成",
	newSheetFilename: "なぞり書き練習",
	createFailed: "練習帳の作成に失敗しました: ",
};

const TABLE: Record<Lang, Strings> = { ko: KO, en: EN, ja: JA };

/** Get the full string table for a language. */
export function strings(lang: Lang): Strings {
	return TABLE[lang] ?? TABLE[DEFAULT_LANG];
}

/** Display names for the glyph/word sets, keyed by set id, per language. */
const SET_NAMES: Record<Lang, Record<string, string>> = {
	ko: {
		"korean-jamo": "한글 자모 연습",
		"alphabet-upper": "알파벳 대문자",
		"alphabet-lower": "알파벳 소문자",
		"hiragana": "히라가나",
		"katakana": "가타카나",
		"numbers": "숫자 0–9",
		"korean-words": "한글 단어 연습",
		"english-words": "영어 단어 연습",
		"japanese-words": "일본어 단어 연습",
	},
	en: {
		"korean-jamo": "Korean Jamo",
		"alphabet-upper": "Uppercase A–Z",
		"alphabet-lower": "Lowercase a–z",
		"hiragana": "Hiragana",
		"katakana": "Katakana",
		"numbers": "Numbers 0–9",
		"korean-words": "Korean words",
		"english-words": "English words",
		"japanese-words": "Japanese words",
	},
	ja: {
		"korean-jamo": "ハングル字母",
		"alphabet-upper": "アルファベット大文字",
		"alphabet-lower": "アルファベット小文字",
		"hiragana": "ひらがな",
		"katakana": "カタカナ",
		"numbers": "数字 0–9",
		"korean-words": "韓国語の単語",
		"english-words": "英語の単語",
		"japanese-words": "日本語の単語",
	},
};

/** Resolve a glyph-set id to its localized display name. */
export function setName(lang: Lang, id: string): string {
	const byLang = SET_NAMES[lang] ?? SET_NAMES[DEFAULT_LANG];
	return byLang[id] ?? id;
}
