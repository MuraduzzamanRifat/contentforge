import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { callLLM, NoProviderError } from "@/lib/llm";
import {
  buildTopicsSystemPrompt, buildTopicsUserMessage, parseTopics, TOPICS_PROMPT_VERSION,
} from "@/lib/prompts/topics";
import { assessTopic } from "@/lib/topic-intake";
import { AGARWOOD_PLAN } from "@/lib/agarwood-plan";
import type { Content } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** `avoid` = already-approved rows (minimal) so we never regenerate them. */
interface Body {
  count?: number;
  avoid?: { title: string; hook?: string; category?: string }[];
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const count = Math.min(8, Math.max(1, Math.floor(body.count ?? 5)));
  const approved = (body.avoid ?? []).filter((a) => a && a.title);

  // Dedupe corpus = the curated 260-plan (the channel's "known topics, never
  // repeat" set) PLUS whatever the operator has already approved.
  const approvedAsContent: Content[] = approved.map((a, i) => ({
    id: `approved-${i}`, rowIndex: i, status: "APPROVED",
    title: a.title, hook: a.hook ?? "", script: "", description: "",
    category: a.category, tags: [], aiCost: 0, createdAt: "", updatedAt: "",
  }));
  const corpus = [...AGARWOOD_PLAN, ...approvedAsContent];
  const avoidTitles = [
    ...AGARWOOD_PLAN.map((r) => r.title),
    ...approved.map((a) => a.title),
  ];

  try {
    const r = await callLLM(
      buildTopicsSystemPrompt(),
      buildTopicsUserMessage(count, avoidTitles),
      4500,
    );
    let drafts;
    try {
      drafts = parseTopics(r.text);
    } catch (e) {
      return NextResponse.json(
        { error: "Model output could not be parsed as topics", detail: e instanceof Error ? e.message : String(e) },
        { status: 502 },
      );
    }
    const candidates = drafts
      .slice(0, count)
      .map((d) => assessTopic(d, randomUUID(), corpus));
    return NextResponse.json({
      candidates,
      provider: r.provider,
      model: r.model,
      promptVersion: TOPICS_PROMPT_VERSION,
      usage: r.usage,
    });
  } catch (err: unknown) {
    if (err instanceof NoProviderError) {
      return NextResponse.json(
        {
          error: "No AI provider configured",
          hint: "Set OPENAI_API_KEY (works on Vercel — no tunnel), or run `claude` locally / set ANTHROPIC_API_KEY.",
        },
        { status: 412 },
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    const hint =
      /quota|insufficient_quota|billing|exceeded your current/i.test(message)
        ? "The OpenAI key has no available quota — add a payment method / credits at platform.openai.com/account/billing, then retry."
      : /401|invalid_api_key|incorrect api key|unauthorized/i.test(message)
        ? "OPENAI_API_KEY is invalid — regenerate it and update it in the Vercel project env."
      : /model.*(not found|does not exist)|does not have access to model|404/i.test(message)
        ? "This key can't use the configured model — set OPENAI_MODEL in Vercel to one you have access to (e.g. gpt-4o-mini)."
      : /rate.?limit|429/i.test(message)
        ? "OpenAI rate limit hit — wait a moment and retry."
      : /timeout|ETIMEDOUT|aborted|FUNCTION_INVOCATION_TIMEOUT/i.test(message)
        ? "The model took too long for 5 scripts — retry; if it persists the serverless function is timing out."
      : undefined;
    return NextResponse.json({ error: "AI call failed", detail: message, hint }, { status: 500 });
  }
}
