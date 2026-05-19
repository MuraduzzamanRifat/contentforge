/**
 * Pure subtitle builders. Side-effect-free → unit tested.
 * Turns parsed scenes (timecodes + beat text) into SRT / WebVTT the operator
 * uploads to YouTube. EN comes straight from the script; KO is produced by
 * translating the cues via the existing /api/ai/translate route (UI side).
 *
 * Honest scope: this emits caption files. It does NOT burn subtitles into the
 * video — YouTube takes the .srt/.vtt directly, which is the right workflow.
 */

export interface Cue {
  start: string; // "m:ss" or "mm:ss"
  end: string;   // may be "" — then we derive it
  text: string;
}

/** "1:23" / "01:23" / "1:02:03" → seconds. Unknown → 0. */
export function tcToSeconds(tc: string): number {
  const parts = tc.trim().split(":").map((n) => parseInt(n, 10));
  if (parts.some((n) => Number.isNaN(n))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

function fmt(total: number, msSep: string): string {
  const s = Math.max(0, Math.floor(total));
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}${msSep}000`;
}

export const srtTime = (sec: number) => fmt(sec, ",");
export const vttTime = (sec: number) => fmt(sec, ".");

/**
 * Resolve each cue's [start,end] in seconds. A missing end uses the next
 * cue's start; the final/only cue gets +30s. End is always ≥ start+1.
 */
export function resolveCues(cues: Cue[]): { start: number; end: number; text: string }[] {
  return cues.map((c, i) => {
    const start = tcToSeconds(c.start);
    let end = c.end ? tcToSeconds(c.end) : 0;
    if (!end) {
      const next = cues[i + 1];
      end = next ? tcToSeconds(next.start) : start + 30;
    }
    if (end <= start) end = start + Math.max(1, Math.ceil((c.text.length || 20) / 15));
    return { start, end, text: c.text.replace(/\s*\n\s*/g, " ").trim() };
  });
}

export function scenesToSrt(cues: Cue[]): string {
  return resolveCues(cues)
    .map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n`)
    .join("\n");
}

export function scenesToVtt(cues: Cue[]): string {
  const body = resolveCues(cues)
    .map((c) => `${vttTime(c.start)} --> ${vttTime(c.end)}\n${c.text}`)
    .join("\n\n");
  return `WEBVTT\n\n${body}\n`;
}
