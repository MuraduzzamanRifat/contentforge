import { NextRequest, NextResponse } from "next/server";
import { callClaude, NoClaudeAuthError } from "@/lib/claude-call";
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
    const r = await callClaude(buildTranslatePrompt(), text, 1200);
    return NextResponse.json({
      translation: r.text,
      auth: r.auth,
      promptVersion: TRANSLATE_PROMPT_VERSION,
    });
  } catch (err: unknown) {
    if (err instanceof NoClaudeAuthError) {
      return NextResponse.json(
        { error: "No Claude auth", hint: "Run `claude` locally or set ANTHROPIC_API_KEY in .env.local." },
        { status: 412 }
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Translation failed", detail: message }, { status: 500 });
  }
}
