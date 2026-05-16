import { NextRequest, NextResponse } from "next/server";
import { callLLM, NoProviderError } from "@/lib/llm";
import { buildTranslatePrompt, TRANSLATE_PROMPT_VERSION } from "@/lib/prompts/translate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const text = (body.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });
  if (text.length > 4000) {
    return NextResponse.json({ error: "text too long (max 4000 chars)" }, { status: 413 });
  }

  try {
    const r = await callLLM(buildTranslatePrompt(), text, 1200);
    return NextResponse.json({
      translation: r.text,
      provider: r.provider,
      promptVersion: TRANSLATE_PROMPT_VERSION,
    });
  } catch (err: unknown) {
    if (err instanceof NoProviderError) {
      return NextResponse.json(
        { error: "No AI provider", hint: "Set OPENAI_API_KEY (works on Vercel), or run `claude` locally / set ANTHROPIC_API_KEY." },
        { status: 412 }
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Translation failed", detail: message }, { status: 500 });
  }
}
