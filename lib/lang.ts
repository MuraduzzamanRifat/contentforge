import type { Lang } from "./types";

/**
 * Heuristic language detection for short review comments.
 * Any Hangul codepoint (syllables U+AC00–U+D7A3 or jamo U+1100–U+11FF) → Korean.
 * Everything else (incl. empty) → English. Mixed text follows the Hangul signal
 * because the Korean client is the one who writes mixed-language notes.
 */
export function detectLang(text: string): Lang {
  return /[가-힣ᄀ-ᇿ㄰-㆏]/.test(text) ? "ko" : "en";
}

export function otherLang(l: Lang): Lang {
  return l === "ko" ? "en" : "ko";
}
