import { NextRequest, NextResponse } from "next/server";
import { callLLM, NoProviderError } from "@/lib/llm";
import { buildReviewSummaryPrompt, REVIEW_SUMMARY_PROMPT_VERSION } from "@/lib/prompts/review-summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

export async function POST(req: NextRequest) {
  let body: { script?: string; title?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const script = (body.script ?? "").trim();
  if (!script) {
    return NextResponse.json({ error: "script required (generate it first)" }, { status: 400 });
  }

  const user = `<script_in>\n${body.title ? `TITLE: ${body.title}\n` : ""}${script}\n</script_in>\n\nProduce the Korean review summary.`;

  try {
    const r = await callLLM(buildReviewSummaryPrompt(), user, 1500);
    return NextResponse.json({
      summary: r.text,
      provider: r.provider,
      promptVersion: REVIEW_SUMMARY_PROMPT_VERSION,
    });
  } catch (err: unknown) {
    if (err instanceof NoProviderError) {
      return NextResponse.json(
        { error: "No AI provider", hint: "Set OPENAI_API_KEY (works on Vercel), or run `claude` locally / set ANTHROPIC_API_KEY." },
        { status: 412 }
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Review summary failed", detail: message }, { status: 500 });
  }
}
