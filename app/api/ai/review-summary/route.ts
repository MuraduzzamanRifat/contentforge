import { NextRequest, NextResponse } from "next/server";
import { callClaude, NoClaudeAuthError } from "@/lib/claude-call";
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
    const r = await callClaude(buildReviewSummaryPrompt(), user, 1500);
    return NextResponse.json({
      summary: r.text,
      auth: r.auth,
      promptVersion: REVIEW_SUMMARY_PROMPT_VERSION,
    });
  } catch (err: unknown) {
    if (err instanceof NoClaudeAuthError) {
      return NextResponse.json(
        { error: "No Claude auth", hint: "Run `claude` locally or set ANTHROPIC_API_KEY in .env.local." },
        { status: 412 }
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Review summary failed", detail: message }, { status: 500 });
  }
}
