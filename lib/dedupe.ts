/**
 * Lexical duplicate detector — surfaces conceptually-overlapping videos before
 * the operator commits a new one. Lightweight (no embeddings), runs client-side.
 *
 * Approach: Jaccard similarity on word tokens + bigrams. Domain stoplist
 * suppresses universally-present tokens ("agarwood", "oud", "tree") that would
 * otherwise inflate every score.
 */

import type { Content } from "./types";

const ENGLISH_STOP = new Set([
  "the","and","for","that","this","with","from","what","why","how","its","but","you",
  "not","are","was","were","they","them","their","there","then","than","into","more",
  "most","over","when","who","which","while","whose","does","did","has","have","had",
  "your","yours","ours","mine","his","her","hers","one","two","very","really","just",
  "about","across","also","been","being","both","each","every","much","some","such",
  "only","still","upon","under","yet","because","before","after","again","through",
  "between","another","first","last","next","onto","off","out","its","it's","won't",
  "isn't","aren't","get","got","make","made","take","took","goes","went","come",
  "came","tell","told","know","knew","said","says","let","also","like","even","ever",
]);

const DOMAIN_STOP = new Set([
  "agarwood","oud","wood","aquilaria","tree","trees","resin","aloeswood","wood's",
  "smell","scent","oil","incense","agar","jinko","kyara","gaharu",
]);

const STOP = new Set([...ENGLISH_STOP, ...DOMAIN_STOP]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

function bigrams(tokens: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) out.push(`${tokens[i]}-${tokens[i + 1]}`);
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

function textOf(c: Content): string {
  return [c.title, c.hook, c.brief ?? "", c.category ?? ""].join(" ");
}

interface Features {
  tokens: Set<string>;
  bigrams: Set<string>;
  category?: string;
}

function featuresOf(c: Content): Features {
  const t = tokenize(textOf(c));
  return {
    tokens: new Set(t),
    bigrams: new Set(bigrams(t)),
    category: c.category,
  };
}

export function similarity(a: Content, b: Content): number {
  const fa = featuresOf(a);
  const fb = featuresOf(b);
  return scoreFeatures(fa, fb, a.category, b.category);
}

function scoreFeatures(fa: Features, fb: Features, catA?: string, catB?: string): number {
  const ja = jaccard(fa.tokens, fb.tokens);
  const jb = jaccard(fa.bigrams, fb.bigrams);
  // Bigrams overweighted — phrase overlap is the real signal.
  let score = jb * 0.65 + ja * 0.35;
  // Small bonus when categories match (e.g. both "Mystery")
  if (catA && catB && catA === catB) score += 0.08;
  return Math.min(1, score);
}

export interface DuplicateMatch {
  row: Content;
  score: number;
}

const DEFAULT_THRESHOLD = 0.22;

/**
 * Build a feature cache for every row once, then run all-pairs similarity.
 * 260 × 260 = 67k pairs runs in ~5ms in browser.
 */
export function buildDuplicateIndex(rows: Content[], threshold = DEFAULT_THRESHOLD) {
  const features = rows.map((r) => ({ id: r.id, f: featuresOf(r), cat: r.category }));
  const byId = new Map<string, DuplicateMatch[]>();
  for (let i = 0; i < rows.length; i++) byId.set(rows[i].id, []);

  for (let i = 0; i < features.length; i++) {
    for (let j = i + 1; j < features.length; j++) {
      const s = scoreFeatures(features[i].f, features[j].f, features[i].cat, features[j].cat);
      if (s >= threshold) {
        byId.get(features[i].id)!.push({ row: rows[j], score: s });
        byId.get(features[j].id)!.push({ row: rows[i], score: s });
      }
    }
  }

  for (const list of byId.values()) list.sort((a, b) => b.score - a.score);
  return byId;
}

export function findDuplicates(
  rows: Content[],
  target: Content,
  limit = 5,
  threshold = DEFAULT_THRESHOLD
): DuplicateMatch[] {
  const targetF = featuresOf(target);
  const out: DuplicateMatch[] = [];
  for (const r of rows) {
    if (r.id === target.id) continue;
    const s = scoreFeatures(targetF, featuresOf(r), target.category, r.category);
    if (s >= threshold) out.push({ row: r, score: s });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function severity(score: number): "low" | "medium" | "high" {
  if (score >= 0.45) return "high";
  if (score >= 0.30) return "medium";
  return "low";
}
