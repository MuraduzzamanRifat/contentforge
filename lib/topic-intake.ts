/**
 * Pure assessment of a generated topic: banned-phrase compliance + lexical
 * duplicate check against the corpus (the 260-plan + already-approved rows).
 * Side-effect free → unit tested. The route attaches this to every candidate
 * so the Generate UI can show an honest badge before the operator approves.
 */

import { scanBanned } from "./seo-preflight";
import { findDuplicates, severity } from "./dedupe";
import type { TopicDraft } from "./prompts/topics";
import type { Content } from "./types";
import type { LinkCheck } from "./source-check";

export interface TopicCandidate extends TopicDraft {
  id: string;
  /** "flag" = a NEVER_SAY phrase appears in title/hook/script. */
  compliance: { level: "ok" | "flag"; hits: string[] };
  /** Closest existing video when the overlap is non-trivial, else null. */
  duplicate: { title: string; score: number; severity: "medium" | "high" } | null;
  /** Liveness of each source (server-checked, aligned by index with sources[]). */
  linkChecks?: LinkCheck[];
}

/** Minimal Content view of a draft so dedupe.ts can score it. */
function asContent(d: TopicDraft, id: string): Content {
  return {
    id,
    rowIndex: 0,
    status: "IDEA",
    title: d.title,
    hook: d.hook,
    script: "",
    description: "",
    category: d.category,
    track: d.track,
    tags: [],
    aiCost: 0,
    createdAt: "",
    updatedAt: "",
  };
}

export function assessTopic(d: TopicDraft, id: string, corpus: Content[]): TopicCandidate {
  const hits = scanBanned(`${d.title}\n${d.hook}\n${d.script}`);
  const top = findDuplicates(corpus, asContent(d, id), 1)[0];
  const sev = top ? severity(top.score) : "low";
  return {
    ...d,
    id,
    compliance: { level: hits.length ? "flag" : "ok", hits },
    duplicate:
      top && sev !== "low"
        ? { title: top.row.title, score: Math.round(top.score * 100) / 100, severity: sev }
        : null,
  };
}
