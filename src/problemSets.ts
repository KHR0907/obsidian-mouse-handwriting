/**
 * ProblemSets — built-in practice content.
 *
 * Two flavours:
 *  - Glyph/word sets (jamo, alphabet, number, word) — a menu you enter directly.
 *  - Quote catalog (poems / songs / novels) — reachable via two menus:
 *      "짧은 글 연습" → pick a quote → trace it ONE LINE at a time.
 *      "긴 글 연습"   → pick a quote → trace the WHOLE passage at once.
 *
 * Pure data + helpers. No Obsidian, no DOM.
 */

export type SetKind =
	| "jamo"
	| "alphabet"
	| "number"
	| "word"
	| "quote-short" // one line per cell (wide canvas)
	| "quote-long"; // whole multi-line passage in one cell (tall canvas)

export interface ProblemSet {
	id: string;
	name: string;
	kind: SetKind;
	/**
	 * The cells to trace, in order.
	 *  - glyph/word: single glyphs or short words.
	 *  - quote-short: each cell is one line of the passage.
	 *  - quote-long: a single cell containing the whole passage (lines joined
	 *    by "\n").
	 */
	cells: string[];
	/** For quotes: the work + author, shown as attribution. */
	source?: string;
}

// ---- glyph / word content ------------------------------------------------

const KOREAN_JAMO = [
	"ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ",
	"ㅋ", "ㅌ", "ㅍ", "ㅎ",
	"ㅏ", "ㅑ", "ㅓ", "ㅕ", "ㅗ", "ㅛ", "ㅜ", "ㅠ", "ㅡ", "ㅣ",
];

const ALPHABET_UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const ALPHABET_LOWER = "abcdefghijklmnopqrstuvwxyz".split("");
const DIGITS = "0123456789".split("");

const HIRAGANA = [
	"あ", "い", "う", "え", "お", "か", "き", "く", "け", "こ",
	"さ", "し", "す", "せ", "そ", "た", "ち", "つ", "て", "と",
	"な", "に", "ぬ", "ね", "の", "は", "ひ", "ふ", "へ", "ほ",
	"ま", "み", "む", "め", "も", "や", "ゆ", "よ",
	"ら", "り", "る", "れ", "ろ", "わ", "を", "ん",
];

const KATAKANA = [
	"ア", "イ", "ウ", "エ", "オ", "カ", "キ", "ク", "ケ", "コ",
	"サ", "シ", "ス", "セ", "ソ", "タ", "チ", "ツ", "テ", "ト",
	"ナ", "ニ", "ヌ", "ネ", "ノ", "ハ", "ヒ", "フ", "ヘ", "ホ",
	"マ", "ミ", "ム", "メ", "モ", "ヤ", "ユ", "ヨ",
	"ラ", "リ", "ル", "レ", "ロ", "ワ", "ヲ", "ン",
];

const KOREAN_WORDS = [
	"사과", "나무", "하늘", "바다", "구름", "사랑", "친구", "학교",
	"바람", "노래", "꿈", "별빛", "여행", "행복", "가족", "시간",
];

const ENGLISH_WORDS = [
	"cat", "dog", "sun", "moon", "tree", "book", "star", "rain",
	"blue", "gold", "wind", "song", "hope", "home", "time", "life",
];

const JAPANESE_WORDS = [
	"りんご", "そら", "うみ", "はな", "ゆき", "つき", "ほし", "かぜ",
	"ねこ", "いぬ", "みず", "やま", "こころ", "ゆめ", "たび", "うた",
];

/**
 * Glyph/word sets shown as top-level menu entries.
 * `name` is a translation key resolved by the view against i18n set names.
 */
export const GLYPH_SETS: ProblemSet[] = [
	{ id: "korean-jamo", name: "korean-jamo", kind: "jamo", cells: KOREAN_JAMO },
	{ id: "alphabet-upper", name: "alphabet-upper", kind: "alphabet", cells: ALPHABET_UPPER },
	{ id: "alphabet-lower", name: "alphabet-lower", kind: "alphabet", cells: ALPHABET_LOWER },
	{ id: "hiragana", name: "hiragana", kind: "jamo", cells: HIRAGANA },
	{ id: "katakana", name: "katakana", kind: "jamo", cells: KATAKANA },
	{ id: "numbers", name: "numbers", kind: "number", cells: DIGITS },
	{ id: "korean-words", name: "korean-words", kind: "word", cells: KOREAN_WORDS },
	{ id: "english-words", name: "english-words", kind: "word", cells: ENGLISH_WORDS },
	{ id: "japanese-words", name: "japanese-words", kind: "word", cells: JAPANESE_WORDS },
];

// ---- quote catalog (poems / songs / novels) ------------------------------

export interface Quote {
	id: string;
	name: string;
	source: string;
	lines: string[];
}

export const QUOTES: Quote[] = [
	{
		id: "seosi",
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
		id: "azalea",
		name: "진달래꽃 — 김소월",
		source: "김소월 「진달래꽃」",
		lines: [
			"나 보기가 역겨워",
			"가실 때에는",
			"말없이 고이 보내 드리오리다",
			"영변에 약산 진달래꽃",
			"아름 따다 가실 길에 뿌리오리다",
		],
	},
	{
		id: "frost",
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
		id: "austen",
		name: "Pride and Prejudice — Austen",
		source: "Jane Austen, Pride and Prejudice",
		lines: [
			"It is a truth universally acknowledged,",
			"that a single man in possession",
			"of a good fortune, must be in",
			"want of a wife.",
		],
	},
	{
		id: "basho",
		name: "古池や — 松尾芭蕉",
		source: "松尾芭蕉「古池や」",
		lines: [
			"古池や",
			"蛙飛び込む",
			"水の音",
		],
	},
];

export function getQuote(id: string): Quote | undefined {
	return QUOTES.find((q) => q.id === id);
}

/** Build the ProblemSet for tracing a quote one line at a time. */
export function shortSetFromQuote(q: Quote): ProblemSet {
	return {
		id: `quote-short:${q.id}`,
		name: q.name,
		kind: "quote-short",
		cells: q.lines,
		source: q.source,
	};
}

/** Build the ProblemSet for tracing a whole quote at once (single cell). */
export function longSetFromQuote(q: Quote): ProblemSet {
	return {
		id: `quote-long:${q.id}`,
		name: q.name,
		kind: "quote-long",
		cells: [q.lines.join("\n")],
		source: q.source,
	};
}

/**
 * Resolve any set id back to a ProblemSet — used when reopening a .penmanship
 * file. Handles glyph sets and both quote flavours.
 */
export function getSet(id: string): ProblemSet | undefined {
	const glyph = GLYPH_SETS.find((s) => s.id === id);
	if (glyph) return glyph;

	const [prefix, quoteId] = id.split(":");
	if (quoteId) {
		const q = getQuote(quoteId);
		if (!q) return undefined;
		if (prefix === "quote-short") return shortSetFromQuote(q);
		if (prefix === "quote-long") return longSetFromQuote(q);
	}
	return undefined;
}
