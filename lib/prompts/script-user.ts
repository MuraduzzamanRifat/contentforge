/**
 * Build the user message for /api/ai/script.
 * Injects the row metadata AND the top-N lexically-similar existing videos
 * so the model has dedupe context inline.
 */

import type { Content, Track } from "../types";
import { findDuplicates } from "../dedupe";

const TRACK_NAMES: Record<Track, string> = {
  A: "Science & The Tree",
  B: "History & Trade",
  C: "Culture / Myth / Medicine",
  D: "Wildcard",
};

export interface UserPromptInput {
  /** Target row to write. */
  target: Pick<
    Content,
    | "title" | "hook" | "brief" | "category" | "track"
    | "visualStyle" | "weekIndex" | "publishSlot"
  >;
  /** Full row list so we can compute nearby titles. */
  all: Content[];
}

export function buildUserMessage({ target, all }: UserPromptInput): string {
  const trackName = target.track ? TRACK_NAMES[target.track] : "Unspecified";

  // Use the dedupe scorer to find the rows most likely to overlap.
  const fullTarget = {
    ...target,
    id: "__target__",
    rowIndex: -1,
    status: "IDEA" as const,
    script: "",
    description: "",
    tags: [],
    aiCost: 0,
    createdAt: "",
    updatedAt: "",
  };
  const nearby = findDuplicates(all, fullTarget, 6, 0.18);
  const overlapBlock =
    nearby.length === 0
      ? "(none — write a fresh angle)"
      : nearby
          .map(
            (n) =>
              `- W${String(n.row.weekIndex ?? 0).padStart(2, "0")}·${n.row.publishSlot ?? "?"} · ${n.row.track ?? "?"} · ${n.row.title} (${(n.score * 100).toFixed(0)}% lexical overlap)`,
          )
          .join("\n");

  return `<row>
title: ${target.title}
hook: ${target.hook}
track: ${target.track ?? "?"} (${trackName})
category: ${target.category ?? "—"}
week_slot: Week ${target.weekIndex ?? "?"} · ${target.publishSlot ?? "?"}
visual_style: ${target.visualStyle ?? "—"}

brief:
${target.brief ?? "(no brief)"}
</row>

<avoid_overlap>
These existing videos have the highest lexical overlap with this row. Your script must take a clearly different angle, evidence set, and synthesis from every one of them. If you cannot differentiate, mark the row [UNVERIFIED: angle conflicts with W##·D] and stop.

${overlapBlock}
</avoid_overlap>

Now produce the five-section output exactly as specified in <output_format>.`;
}
