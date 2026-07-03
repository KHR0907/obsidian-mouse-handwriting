/**
 * ProblemSets — built-in practice content, like 한컴타자연습's word / long-text drills.
 *
 * Pure data + helpers. No Obsidian, no DOM.
 */

export type SetKind = "jamo" | "alphabet" | "number" | "word" | "longtext";

export interface ProblemSet {
	id: string;
	name: string;
	kind: SetKind;
	/** The cells to trace, in order. For longtext these are eojeol (words). */
	cells: string[];
}

/** Split a sentence/paragraph into eojeol (whitespace-separated words). */
export function splitEojeol(text: string): string[] {
	return text
		.split(/\s+/)
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
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

const KOREAN_SENTENCE =
	"오늘도 좋은 하루 되세요 마음이 따뜻해지는 글씨 연습";

const ENGLISH_SENTENCE =
	"the quick brown fox jumps over the lazy dog";

export const BUILTIN_SETS: ProblemSet[] = [
	{ id: "korean-jamo", name: "한글 자모 연습", kind: "jamo", cells: KOREAN_JAMO },
	{ id: "alphabet-upper", name: "알파벳 대문자", kind: "alphabet", cells: ALPHABET_UPPER },
	{ id: "alphabet-lower", name: "알파벳 소문자", kind: "alphabet", cells: ALPHABET_LOWER },
	{ id: "numbers", name: "숫자 0–9", kind: "number", cells: DIGITS },
	{ id: "korean-words", name: "한글 단어 연습", kind: "word", cells: KOREAN_WORDS },
	{ id: "english-words", name: "영어 단어 연습", kind: "word", cells: ENGLISH_WORDS },
	{
		id: "korean-longtext",
		name: "긴 글 연습 (한글)",
		kind: "longtext",
		cells: splitEojeol(KOREAN_SENTENCE),
	},
	{
		id: "english-longtext",
		name: "긴 글 연습 (영어)",
		kind: "longtext",
		cells: splitEojeol(ENGLISH_SENTENCE),
	},
];

export function getSet(id: string): ProblemSet | undefined {
	return BUILTIN_SETS.find((s) => s.id === id);
}
