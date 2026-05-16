import type { Content } from "./types";
import { ANIMATION } from "./project-config";

/**
 * Build a Google Flow / Veo-ready visual prompt for a row.
 * Includes the channel animation rules so every clip is style-consistent.
 */
export function buildFlowPrompt(row: Content): string {
  const parts = [
    "STYLE: Cartoon-based 2D motion graphics. Faceless characters allowed. Stylized illustration, factually-accurate on-screen content.",
    row.visualStyle ? `SHOT: ${row.visualStyle}` : null,
    row.title ? `SUBJECT: ${row.title}` : null,
    row.hook ? `OPENING BEAT: ${row.hook}` : null,
    "AVOID: photoreal wild-forest stock, invented dates, faces with identifiable features, wild-harvest imagery.",
    `RULE: ${ANIMATION.rule}`,
  ].filter(Boolean);
  return parts.join("\n");
}
