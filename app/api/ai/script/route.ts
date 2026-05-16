import { NextRequest, NextResponse } from "next/server";
import { callLLM, NoProviderError } from "@/lib/llm";
import { buildSystemPrompt, SYSTEM_PROMPT_VERSION } from "@/lib/prompts/script-system";
import { buildUserMessage } from "@/lib/prompts/script-user";
import type { Content, Track } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Body {
  title: string;
  hook: string;
  brief?: string;
  category?: string;
  track?: Track;
  visualStyle?: string;
  weekIndex?: number;
  publishSlot?: "Mon" | "Wed" | "Fri" | "Sun";
  /** Full row list so the server can compute lexical-overlap context. */
  allRows?: Content[];
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.title || !body.hook) {
    return NextResponse.json({ error: "title and hook required" }, { status: 400 });
  }

  const systemPrompt = buildSystemPrompt();
  const userMessage = buildUserMessage({
    target: {
      title: body.title,
      hook: body.hook,
      brief: body.brief,
      category: body.category,
      track: body.track,
      visualStyle: body.visualStyle,
      weekIndex: body.weekIndex,
      publishSlot: body.publishSlot,
    },
    all: body.allRows ?? [],
  });

  try {
    const r = await callLLM(systemPrompt, userMessage, 3000);
    return NextResponse.json({
      text: r.text,
      provider: r.provider,
      model: r.model,
      promptVersion: SYSTEM_PROMPT_VERSION,
      usage: r.usage,
    });
  } catch (err: unknown) {
    if (err instanceof NoProviderError) {
      return NextResponse.json(
        {
          error: "No AI provider configured",
          hint: "Set OPENAI_API_KEY (works on Vercel — no tunnel), or run `claude` locally / set ANTHROPIC_API_KEY.",
        },
        { status: 412 }
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "AI call failed", detail: message }, { status: 500 });
  }
}
