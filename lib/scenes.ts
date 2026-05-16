/**
 * Pure script → scene parsing for Stage 2 (Production).
 * Side-effect-free → unit tested. No React/Zustand.
 *
 * The script-system prompt emits time-coded beats:
 *   - Hook (0:00–0:08): ...
 *   - Cold-open (0:08–0:25): ...
 *   - Problem (0:25–0:55): ...
 *   - Proof (0:55–1:45): ...
 *   - Synthesis (1:45–2:10): ...
 *   - CTA (2:10–2:30): ...
 * Each beat becomes one Google-Flow scene. Free-form scripts (no time codes)
 * collapse to a single "Full video" scene — we never invent scene splits.
 */

export interface ParsedScene {
  id: string; // stable slug, unique within the script
  label: string;
  start: string; // "0:00"
  end: string; // "0:08"
  text: string;
}

// Matches an optional leading "- ", a beat label, a (m:ss–m:ss) range, ":" then text.
// En-dash, em-dash or hyphen accepted as the range separator.
const BEAT_RE =
  /^[-*\s]*([A-Za-z][A-Za-z /&'-]*?)\s*\((\d{1,2}:\d{2})\s*[–—-]\s*(\d{1,2}:\d{2})\)\s*:?\s*(.*)$/;

function slug(s: string, i: number): string {
  const base = s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `${base || "scene"}-${i}`;
}

/** Isolate the SCRIPT section if the 5-section format is present; otherwise use the whole text. */
function scriptSection(script: string): string {
  const start = script.search(/^\s*\d?\)?\s*SCRIPT\s*$/im);
  if (start === -1) return script;
  const after = script.slice(start);
  const end = after.search(/^\s*\d?\)?\s*ON-SCREEN TEXT\s*$/im);
  return end === -1 ? after : after.slice(0, end);
}

export function parseScenes(script: string): ParsedScene[] {
  if (!script || !script.trim()) return [];
  const body = scriptSection(script);
  const scenes: ParsedScene[] = [];
  let pending: ParsedScene | null = null;

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    const m = line.match(BEAT_RE);
    if (m) {
      if (pending) scenes.push(pending);
      const label = m[1].trim();
      pending = {
        id: slug(label, scenes.length),
        label,
        start: m[2],
        end: m[3],
        text: m[4].trim(),
      };
    } else if (pending && line) {
      // continuation line for the current beat
      pending.text = pending.text ? `${pending.text}\n${line}` : line;
    }
  }
  if (pending) scenes.push(pending);

  if (scenes.length === 0) {
    return [
      {
        id: "full-video-0",
        label: "Full video",
        start: "0:00",
        end: "",
        text: script.trim(),
      },
    ];
  }
  return scenes;
}

/** The single ANIMATION DIRECTION line, if the 5-section format is present. */
export function extractAnimationDirection(script: string): string | null {
  const i = script.search(/^\s*\d?\)?\s*ANIMATION DIRECTION\s*$/im);
  if (i === -1) return null;
  const lines = script.slice(i).split(/\r?\n/).slice(1);
  for (const l of lines) {
    const t = l.trim();
    if (t) return t;
  }
  return null;
}

/** The ON-SCREEN TEXT bullets, if present (each must be factually verified on screen). */
export function extractOnScreenText(script: string): string[] {
  const i = script.search(/^\s*\d?\)?\s*ON-SCREEN TEXT\s*$/im);
  if (i === -1) return [];
  const after = script.slice(i).split(/\r?\n/).slice(1);
  const out: string[] = [];
  for (const raw of after) {
    const t = raw.trim();
    if (/^\d?\)?\s*YOUTUBE DESCRIPTION/i.test(t)) break; // next section
    if (/^[-*]\s+/.test(t)) out.push(t.replace(/^[-*]\s+/, ""));
  }
  return out;
}
