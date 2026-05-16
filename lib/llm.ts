/**
 * Provider-agnostic server-side LLM caller. One entry point for all AI routes.
 * Dispatches by detectConnections().provider:
 *   claude-subscription → Claude Code Agent SDK (free, self-host only)
 *   openai              → OpenAI Chat Completions (works on Vercel serverless)
 *   claude-api          → Anthropic SDK (paid)
 *   none                → throws NoProviderError (route returns 412)
 */

import { detectConnections, OPENAI_MODEL } from "./providers";

const CLAUDE_MODEL = "claude-opus-4-7";

export interface LLMResult {
  text: string;
  provider: "claude-subscription" | "openai" | "claude-api";
  model: string;
  usage?: { input_tokens?: number; output_tokens?: number };
}

export class NoProviderError extends Error {
  constructor() {
    super("No AI provider configured");
    this.name = "NoProviderError";
  }
}

export async function callLLM(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 1500,
): Promise<LLMResult> {
  const { provider } = detectConnections();
  if (provider === "none") throw new NoProviderError();

  if (provider === "openai") {
    const { default: OpenAI } = await import("openai");
    const ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    const res = await ai.chat.completions.create({
      model: OPENAI_MODEL,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });
    const text = (res.choices[0]?.message?.content ?? "").trim();
    return {
      text,
      provider: "openai",
      model: OPENAI_MODEL,
      usage: res.usage
        ? { input_tokens: res.usage.prompt_tokens, output_tokens: res.usage.completion_tokens }
        : undefined,
    };
  }

  if (provider === "claude-subscription") {
    const { query } = await import("@anthropic-ai/claude-agent-sdk");
    let text = "";
    for await (const ev of query({
      prompt: userMessage,
      options: {
        model: CLAUDE_MODEL,
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
    return { text: text.trim(), provider: "claude-subscription", model: CLAUDE_MODEL };
  }

  // claude-api
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const res = await ai.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userMessage }],
  });
  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
  return { text, provider: "claude-api", model: CLAUDE_MODEL, usage: res.usage };
}
