import { NextRequest, NextResponse } from "next/server";
import { detectConnections } from "@/lib/providers";
import { buildSystemPrompt, SYSTEM_PROMPT_VERSION } from "@/lib/prompts/script-system";
import { buildUserMessage } from "@/lib/prompts/script-user";
import type { Content, Track } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = "claude-opus-4-7";

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

  const conn = detectConnections();
  if (conn.claude.auth === "none") {
    return NextResponse.json(
      {
        error: "No Claude auth configured",
        hint:
          "Either run `claude` locally to set up your Pro/Max subscription, or add ANTHROPIC_API_KEY to .env.local.",
      },
      { status: 412 }
    );
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
    if (conn.claude.auth === "subscription") {
      // Claude Pro/Max subscription via Claude Code session.
      const { query } = await import("@anthropic-ai/claude-agent-sdk");
      let text = "";
      for await (const ev of query({
        prompt: userMessage,
        options: {
          model: MODEL,
          systemPrompt: { type: "preset", preset: "claude_code", append: systemPrompt },
          allowedTools: [],
          permissionMode: "bypassPermissions",
        },
      })) {
        if (ev.type === "assistant" && "message" in ev) {
          for (const block of (ev.message as { content: Array<{ type: string; text?: string }> }).content) {
            if (block.type === "text" && block.text) text += block.text;
          }
        }
      }
      return NextResponse.json({
        text,
        auth: "subscription",
        model: MODEL,
        promptVersion: SYSTEM_PROMPT_VERSION,
      });
    }

    // Fallback: direct Anthropic SDK with API key + prompt caching on the static system block.
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const res = await ai.messages.create({
      model: MODEL,
      max_tokens: 3000,
      system: [
        {
          type: "text",
          text: systemPrompt,
          // The system prompt is large and static across calls — cache it.
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    });
    const text = res.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();

    return NextResponse.json({
      text,
      auth: "api-key",
      model: MODEL,
      promptVersion: SYSTEM_PROMPT_VERSION,
      usage: res.usage,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "AI call failed", detail: message }, { status: 500 });
  }
}
