import { NextRequest, NextResponse } from "next/server";
import { callLLM, NoProviderError } from "@/lib/llm";
import { buildSeoPrompt, SEO_PROMPT_VERSION } from "@/lib/prompts/seo";
import type { Track } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

interface Body {
  title?: string;
  track?: Track;
  category?: string;
  script?: string;
}

/** Pull the first balanced {...} JSON object out of a model response. */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) throw new Error("no JSON object found");
  return JSON.parse(raw.slice(start, end + 1));
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.title || !body.script) {
    return NextResponse.json(
      { error: "title and script required (generate + approve the script first)" },
      { status: 400 }
    );
  }

  const trackName =
    body.track === "A" ? "Science & The Tree"
    : body.track === "B" ? "History & Trade"
    : body.track === "C" ? "Culture / Myth / Medicine"
    : body.track === "D" ? "Wildcard" : "—";

  const user = `TITLE: ${body.title}
TRACK: ${body.track ?? "?"} (${trackName})
CATEGORY: ${body.category ?? "—"}
SCRIPT:
${body.script}

Output the metadata JSON.`;

  try {
    const r = await callLLM(buildSeoPrompt(), user, 2000);
    let meta: unknown;
    try {
      meta = extractJson(r.text);
    } catch {
      return NextResponse.json(
        { error: "Model did not return parseable JSON", raw: r.text.slice(0, 800) },
        { status: 502 }
      );
    }
    return NextResponse.json({ meta, provider: r.provider, promptVersion: SEO_PROMPT_VERSION });
  } catch (err: unknown) {
    if (err instanceof NoProviderError) {
      return NextResponse.json(
        { error: "No AI provider", hint: "Set OPENAI_API_KEY (works on Vercel), or run `claude` locally / set ANTHROPIC_API_KEY." },
        { status: 412 }
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "SEO generation failed", detail: message }, { status: 500 });
  }
}
