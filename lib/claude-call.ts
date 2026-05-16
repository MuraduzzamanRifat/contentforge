/**
 * Shared server-side Claude caller. Mirrors the auth strategy used by
 * /api/ai/script: Pro/Max subscription via the Agent SDK first, then the
 * Anthropic SDK with ANTHROPIC_API_KEY (prompt-cached) as a fallback.
 */

import { detectConnections } from "./providers";

const MODEL = "claude-opus-4-7";

export interface ClaudeResult {
  text: string;
  auth: "subscription" | "api-key";
  model: string;
  usage?: { input_tokens?: number; output_tokens?: number };
}

export class NoClaudeAuthError extends Error {
  constructor() {
    super("No Claude auth configured");
    this.name = "NoClaudeAuthError";
  }
}

export async function callClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 1500,
): Promise<ClaudeResult> {
  const conn = detectConnections();
  if (conn.claude.auth === "none") throw new NoClaudeAuthError();

  if (conn.claude.auth === "subscription") {
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
    return { text: text.trim(), auth: "subscription", model: MODEL };
  }

  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const res = await ai.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userMessage }],
  });
  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
  return { text, auth: "api-key", model: MODEL, usage: res.usage };
}
