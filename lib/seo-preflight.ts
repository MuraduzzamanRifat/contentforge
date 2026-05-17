/**
 * Pure publish-preflight checks. Side-effect-free → unit tested.
 * Runs client-side before the operator can publish/schedule, independent of
 * what the model claimed in `complianceNote` (defense in depth).
 */

import { NEVER_SAY } from "./project-config";
import type { SeoMeta } from "./types";

export type { SeoMeta };

export type CheckLevel = "pass" | "warn" | "fail";

export interface PreflightCheck {
  id: string;
  label: string;
  level: CheckLevel;
  detail?: string;
}

const DISCLAIMER_MARKERS = [
  "not medical advice",
  "not intended to",
  "traditional use only",
];

/**
 * Scan arbitrary text for NEVER_SAY banned phrases. Shared by the publish
 * preflight (SeoMeta) and the topic-intake compliance check (title+hook+
 * script) so there is exactly one banned-phrase implementation.
 */
export function scanBanned(text: string): string[] {
  const haystack = text.toLowerCase();
  const hits: string[] = [];
  for (const n of NEVER_SAY) {
    // NEVER_SAY phrases look like:
    //   '"Cures cancer / dementia / Alzheimer\'s"'
    //   '"Wild-harvested" or "ancient tree"'
    //   'Specific dosages or drug interactions you weren't trained on'
    // Extract each internally-quoted segment; if none, use the whole phrase.
    const quoted = [...n.phrase.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    const segments = quoted.length > 0 ? quoted : [n.phrase];

    // Each segment may still hold "/"-separated alternatives.
    const phrases = segments
      .flatMap((seg) => seg.split("/"))
      .map((p) => p.trim().toLowerCase())
      .filter((p) => p.length >= 5);

    for (const p of phrases) {
      if (haystack.includes(p)) hits.push(p);
    }
  }
  return [...new Set(hits)];
}

/** Banned-phrase scan over title + description + tags + hashtags. */
function bannedHits(meta: SeoMeta): string[] {
  return scanBanned(
    [meta.title, meta.description, ...(meta.tags ?? []), ...(meta.hashtags ?? [])].join("  "),
  );
}

const MM_SS = /^\d{1,2}:\d{2}$/;

export function preflight(meta: SeoMeta): PreflightCheck[] {
  const checks: PreflightCheck[] = [];

  // 1. Banned phrases (hard fail)
  const hits = bannedHits(meta);
  checks.push(
    hits.length === 0
      ? { id: "compliance", label: "No banned phrases", level: "pass" }
      : {
          id: "compliance",
          label: "Banned phrase detected",
          level: "fail",
          detail: hits.join(", "),
        }
  );

  // 2. Title length
  const tl = (meta.title ?? "").trim().length;
  checks.push(
    tl === 0
      ? { id: "title", label: "Title is empty", level: "fail" }
      : tl <= 70
      ? { id: "title", label: `Title ${tl}/70`, level: "pass" }
      : { id: "title", label: `Title too long (${tl}/70)`, level: "fail" }
  );

  // 3. Disclaimer present in description
  const desc = (meta.description ?? "").toLowerCase();
  const hasDisclaimer = DISCLAIMER_MARKERS.some((m) => desc.includes(m));
  checks.push(
    hasDisclaimer
      ? { id: "disclaimer", label: "Disclaimer present", level: "pass" }
      : { id: "disclaimer", label: "Missing supplement disclaimer", level: "fail" }
  );

  // 4. Daracheon disclosure present
  const hasSponsor = desc.includes("daracheon") || desc.includes("zoell life");
  checks.push(
    hasSponsor
      ? { id: "sponsor", label: "Daracheon disclosure present", level: "pass" }
      : { id: "sponsor", label: "Daracheon disclosure missing", level: "warn" }
  );

  // 5. Chapters: first must be 00:00, all well-formed
  const ch = meta.chapters ?? [];
  if (ch.length === 0) {
    checks.push({ id: "chapters", label: "No chapters", level: "warn" });
  } else {
    const firstZero = ch[0]?.time === "00:00" || ch[0]?.time === "0:00";
    const wellFormed = ch.every((c) => MM_SS.test(c.time) && c.label.trim().length > 0);
    checks.push(
      firstZero && wellFormed
        ? { id: "chapters", label: `${ch.length} chapters`, level: "pass" }
        : {
            id: "chapters",
            label: !firstZero ? "First chapter must be 00:00" : "Malformed chapter timestamps",
            level: "fail",
          }
    );
  }

  // 6. Tags & hashtags counts
  const tagN = (meta.tags ?? []).length;
  checks.push(
    tagN >= 8 && tagN <= 15
      ? { id: "tags", label: `${tagN} tags`, level: "pass" }
      : { id: "tags", label: `${tagN} tags (want 8–15)`, level: "warn" }
  );
  const hN = (meta.hashtags ?? []).length;
  checks.push(
    hN === 3
      ? { id: "hashtags", label: "3 hashtags", level: "pass" }
      : { id: "hashtags", label: `${hN} hashtags (want 3)`, level: "warn" }
  );

  return checks;
}

/** Publishing is blocked while any check is a hard fail. Warnings don't block. */
export function canPublish(checks: PreflightCheck[]): boolean {
  return checks.every((c) => c.level !== "fail");
}
