/**
 * Prompt + parser for /api/ai/topics — the Generate stage.
 *
 * The operator clicks "Generate"; the model invents N *distinct* agarwood
 * video topics, each with a complete short script and sourced facts, as STRICT
 * JSON (reliable to parse — unlike the labelled-prose script package).
 *
 * Same compliance spine as script-system.ts: it pulls every rule from
 * project-config so brand/compliance changes propagate automatically. The
 * no-repeat rule is enforced by passing the avoid-list (260-plan corpus +
 * already-approved titles) and is double-checked server-side with dedupe.ts.
 *
 * Engineered (/senior-prompt-engineer): role framing · XML rule structure ·
 * one JSON exemplar · [UNVERIFIED] escape hatch · explicit JSON schema · no
 * Markdown · per-topic distinctness requirement.
 */

import {
  ANIMATION, BRAND, NEVER_SAY, ALWAYS_FRAME, PRODUCT, PRODUCTION,
  SPECIES, SOURCE_MAP, CTA,
} from "../project-config";
import type { Track } from "../types";

export const TOPICS_PROMPT_VERSION = "2026-05-17a";

/** One raw topic as emitted by the model (pre-assessment). */
export interface TopicDraft {
  title: string;
  hook: string;
  track: Track;
  category: string;
  script: string;
  sources: string[];
}

const ROLE = `You are a senior researcher-writer for an educational YouTube channel about agarwood (oud / 침향 / chen-xiang). You combine the rigor of a PubMed-trained science writer with the narrative instincts of a top documentary editor. You refuse to invent facts; you refuse to repeat topics; you write copy that converts viewers into Daracheon customers without compromising compliance.`;

const TASK = `Invent COUNT distinct, factual agarwood video topics. Each must be a topic this channel has not covered (see <avoid_overlap>) and must be clearly distinct from the OTHER topics you return in this same batch. For each topic produce a complete short script and its fact sources. Output STRICT JSON only — see <output_format>.`;

function rules(): string {
  return `<rules>

<rule severity="hard" id="factual">
Every concrete claim must be verifiable from a primary source.
- Confident: state it and cite inline with a numbered footnote [1] that maps to an entry in that topic's "sources".
- Not confident: write "[UNVERIFIED: <what to check>]" — never bluff, never "some say".
- Trusted sources by track:
  · Track A (Science & The Tree): ${SOURCE_MAP.A.sources.join(" · ")}
  · Track B (History & Trade): ${SOURCE_MAP.B.sources.join(" · ")}
  · Track C (Culture / Myth / Medicine): ${SOURCE_MAP.C.sources.join(" · ")}
  · Track D (Wildcard): ${SOURCE_MAP.D.sources.join(" · ")}
</rule>

<rule severity="hard" id="no_repeat">
Read <avoid_overlap> — those topics already exist. Every topic you return must take a clearly different subject, angle, and evidence set from every line there AND from every other topic in this batch. Do not re-skin an existing topic with new words.
</rule>

<rule severity="hard" id="cta">
End every script with the Daracheon close. Use this transition then the disclaimer verbatim:
"${CTA.outroLine}"
Then on its own line:
"Traditionally used for qi circulation, sleep, vascular health. This is not medical advice and is not intended to diagnose, treat, cure, or prevent any disease."
</rule>

<rule severity="hard" id="animation">
${ANIMATION.style} ${ANIMATION.rule}
</rule>

<rule severity="hard" id="never_say">
These phrases or equivalents must never appear in title, hook, or script:
${NEVER_SAY.map((n) => `- ${n.phrase} — ${n.reason}`).join("\n")}
</rule>

<rule severity="soft" id="always_frame">
${ALWAYS_FRAME.map((s) => `- ${s}`).join("\n")}
</rule>

<rule severity="soft" id="shape">
- title: ≤ 70 characters, specific, no clickbait that the script can't pay off
- hook: 1 sentence, ≤ 18 words
- track: one of A | B | C | D (A=Science, B=History/Trade, C=Culture/Myth/Medicine, D=Wildcard)
- category: 1–3 words (e.g. "Formation", "Trade route", "Chemistry")
- script: plain text, 230–360 words, with these beats then the CTA:
  Hook: … / Cold-open: … / Problem: … / Proof: 3 sourced beats citing [1][2][3] / Synthesis: … / CTA: <the close from rule cta>
- sources: 3–6 entries, each a specific URL or named primary source matching the track
</rule>

</rules>`;
}

function context(): string {
  return `<brand_facts>
Brand: ${BRAND.brandEnglish} — ${BRAND.brand}
Company: ${BRAND.company}
Site: ${BRAND.site}
Species (cite freely): ${SPECIES.scientific} — registered in ${SPECIES.registration}
Active compound: ${PRODUCT.activeCompound}
Farms: ${PRODUCTION.farms} — ${PRODUCTION.area}
Certification stack: ${PRODUCTION.certifications.map((c) => c.name).join(" · ")}
</brand_facts>`;
}

const OUTPUT_FORMAT = `<output_format>
Return ONLY a JSON array of COUNT objects. No prose before or after. No Markdown, no code fences. Each object has exactly these keys:
{
  "title": string,
  "hook": string,
  "track": "A" | "B" | "C" | "D",
  "category": string,
  "script": string,
  "sources": string[]
}
</output_format>`;

const EXEMPLAR = `<exemplar>
One element of the array (yours must be a DIFFERENT topic):
{
  "title": "Why Agarwood Sinks: The Density Test Buyers Trust",
  "hook": "Drop real agarwood in water and it does the opposite of what wood should.",
  "track": "A",
  "category": "Grading",
  "script": "Hook: Drop real agarwood in water and it does the opposite of what wood should. Cold-open: Most wood floats. High-grade agarwood sinks — because resin, not cellulose, now fills the cells [1]. Problem: For centuries the sink test was the only field grade; today it still anchors pricing, and fakes are engineered to beat it [2]. Proof: Beat 1 — resin content above roughly the density of water makes the piece sink [1]. Beat 2 — graders historically split 'sinking' vs 'floating' grades, a system documented in trade records [2]. Beat 3 — modern adulteration injects heavy oils to fake a sink, which lab GC-MS exposes [3]. Synthesis: The sink test measures resin saturation, not magic — which is exactly why it can be gamed and why provenance matters. CTA: ${CTA.outroLine}\\n\\nTraditionally used for qi circulation, sleep, vascular health. This is not medical advice and is not intended to diagnose, treat, cure, or prevent any disease.",
  "sources": [
    "https://pmc.ncbi.nlm.nih.gov/articles/PMC6271187/",
    "JSTOR — historical agarwood grading in the maritime incense trade",
    "https://www.sciencedirect.com/ — GC-MS detection of adulterated agarwood oil"
  ]
}
</exemplar>`;

export function buildTopicsSystemPrompt(): string {
  return `${ROLE}

${TASK}

${rules()}

${context()}

${OUTPUT_FORMAT}

${EXEMPLAR}`;
}

export function buildTopicsUserMessage(count: number, avoidTitles: string[]): string {
  const list = avoidTitles.length
    ? avoidTitles.slice(0, 400).map((t) => `- ${t}`).join("\n")
    : "- (none yet — this is the first batch)";
  return `<request>
COUNT = ${count}
</request>

<avoid_overlap>
${list}
</avoid_overlap>

Return the JSON array of ${count} distinct topics now. JSON only.`;
}

const TRACKS = new Set<Track>(["A", "B", "C", "D"]);

/**
 * Parse the model's reply into TopicDrafts. Tolerant of stray prose / code
 * fences around the array; strict about the per-item shape. Throws when no
 * usable array is found so the route can surface an honest error.
 */
export function parseTopics(text: string): TopicDraft[] {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("topics: no JSON array in model output");
  }
  let arr: unknown;
  try {
    arr = JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new Error("topics: model output was not valid JSON");
  }
  if (!Array.isArray(arr)) throw new Error("topics: expected a JSON array");

  const out: TopicDraft[] = [];
  for (const it of arr) {
    if (!it || typeof it !== "object") continue;
    const o = it as Record<string, unknown>;
    const title = String(o.title ?? "").trim();
    const hook = String(o.hook ?? "").trim();
    const script = String(o.script ?? "").trim();
    if (!title || !script) continue; // unusable
    const track = (String(o.track ?? "").toUpperCase() as Track);
    out.push({
      title,
      hook,
      track: TRACKS.has(track) ? track : "D",
      category: String(o.category ?? "").trim() || "General",
      script,
      sources: Array.isArray(o.sources)
        ? o.sources.map((s) => String(s).trim()).filter(Boolean)
        : [],
    });
  }
  if (out.length === 0) throw new Error("topics: no usable topics in model output");
  return out;
}
