/**
 * ProblemSets — built-in practice content, like 한컴타자연습's word / long-text drills.
 *
 * Pure data + helpers. No Obsidian, no DOM.
 */

export type SetKind = "jamo" | "alphabet" | "number" | "word" | "quote";

export interface ProblemSet {
	id: string;
	name: string;
	kind: SetKind;
	/**
	 * The cells to trace, in order. For jamo/alphabet/number/word these are
	 * single glyphs or short words. For `quote` each cell is one LINE of a
	 * famous passage, traced across a wide canvas.
	 */
	cells: string[];
	/** For quotes: the work + author, shown as attribution. */
	source?: string;
}

const KOREAN_JAMO = [
	"ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ",
	"ㅋ", "ㅌ", "ㅍ", "ㅎ",
	"ㅏ", "ㅑ", "ㅓ", "ㅕ", "ㅗ", "ㅛ", "ㅜ", "ㅠ", "ㅡ", "ㅣ",
];

const ALPHABET_UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const ALPHABET_LOWER = "abcdefghijklmnopqrstuvwxyz".split("");
const DIGITS = "0123456789".split("");

const KOREAN_WORDS = [
	"사과", "나무", "하늘", "바다", "구름", "사랑", "친구", "학교",
	"바람", "노래", "꿈", "별빛", "여행", "행복", "가족", "시간",
];

const ENGLISH_WORDS = [
	"cat", "dog", "sun", "moon", "tree", "book", "star", "rain",
	"blue", "gold", "wind", "song", "hope", "home", "time", "life",
];

/**
 * Famous passages for the "긴 글 연습" — trace a beloved poem / song / novel
 * line by line into your note. Each string is one line (one cell).
 */
interface QuoteDef {
	id: string;
	name: string;
	source: string;
	lines: string[];
}

const QUOTES: QuoteDef[] = [
	{
		id: "quote-seosi",
		name: "서시 — 윤동주",
		source: "윤동주 「서시」",
		lines: [
			"죽는 날까지 하늘을 우러러",
			"한 점 부끄럼이 없기를,",
			"잎새에 이는 바람에도",
			"나는 괴로워했다.",
			"별을 노래하는 마음으로",
			"모든 죽어 가는 것을 사랑해야지",
		],
	},
	{
		id: "quote-azalea",
		name: "진달래꽃 — 김소월",
		source: "김소월 「진달래꽃」",
		lines: [
			"나 보기가 역겨워",
			"가실 때에는",
			"말없이 고이 보내 드리오리다",
			"영변에 약산",
			"진달래꽃",
			"아름 따다 가실 길에 뿌리오리다",
		],
	},
	{
		id: "quote-frost",
		name: "The Road Not Taken — Frost",
		source: "Robert Frost, \"The Road Not Taken\"",
		lines: [
			"Two roads diverged in a yellow wood,",
			"And sorry I could not travel both",
			"And be one traveler, long I stood",
			"I took the one less traveled by,",
			"And that has made all the difference.",
		],
	},
	{
		id: "quote-austen",
		name: "Pride and Prejudice — Austen",
		source: "Jane Austen, Pride and Prejudice",
		lines: [
			"It is a truth universally acknowledged,",
			"that a single man in possession",
			"of a good fortune,",
			"must be in want of a wife.",
		],
	},
];

export const BUILTIN_SETS: ProblemSet[] = [
	{ id: "korean-jamo", name: "한글 자모 연습", kind: "jamo", cells: KOREAN_JAMO },
	{ id: "alphabet-upper", name: "알파벳 대문자", kind: "alphabet", cells: ALPHABET_UPPER },
	{ id: "alphabet-lower", name: "알파벳 소문자", kind: "alphabet", cells: ALPHABET_LOWER },
	{ id: "numbers", name: "숫자 0–9", kind: "number", cells: DIGITS },
	{ id: "korean-words", name: "한글 단어 연습", kind: "word", cells: KOREAN_WORDS },
	{ id: "english-words", name: "영어 단어 연습", kind: "word", cells: ENGLISH_WORDS },
	...QUOTES.map(
		(q): ProblemSet => ({
			id: q.id,
			name: q.name,
			kind: "quote",
			cells: q.lines,
			source: q.source,
		})
	),
];

export function getSet(id: string): ProblemSet | undefined {
	return BUILTIN_SETS.find((s) => s.id === id);
}
