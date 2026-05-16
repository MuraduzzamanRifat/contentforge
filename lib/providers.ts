/**
 * AI provider detection (server-only).
 *
 * Precedence (see resolveProvider — pure & unit-tested):
 *  1. Claude Pro/Max subscription — CLAUDE_CODE_OAUTH_TOKEN, or a local
 *     Claude Code session (~/.claude/settings.json). Free; only works where
 *     the Claude runtime/creds exist (your machine / self-host), NOT serverless.
 *  2. OPENAI_API_KEY — works anywhere incl. Vercel serverless. The simple
 *     deploy path: provide this key and the app is fully live, no tunnel.
 *  3. ANTHROPIC_API_KEY — Claude via paid API.
 *  4. none — AI routes return an honest 412; the rest of the app still works.
 *
 * Net effect: on Vercel (no Claude session) + OPENAI_API_KEY → OpenAI is used
 * automatically. Locally with a Claude session → the free subscription is used.
 */

import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type AiProvider = "claude-subscription" | "openai" | "claude-api" | "none";
/** Kept for the existing Connections UI (subscription | api-key | none). */
export type ClaudeAuth = "subscription" | "api-key" | "none";

export interface Connections {
  provider: AiProvider;
  /** Human label for the active provider, e.g. "OpenAI (gpt-4o)". */
  providerLabel: string;
  claude: {
    available: boolean;
    auth: ClaudeAuth;
    accountHint?: string;
  };
  gemini: { available: boolean };
  googleFlow: { programmatic: boolean };
  /** GitHub-as-DB shared board persistence. */
  board: { configured: boolean; repo?: string };
}

function detectClaudeSubscription(): { ok: boolean; accountHint?: string } {
  try {
    const dir = join(homedir(), ".claude");
    if (!existsSync(dir)) return { ok: false };
    const entries = readdirSync(dir);
    if (entries.includes("settings.json")) return { ok: true };
    return { ok: false };
  } catch {
    return { ok: false };
  }
}

/**
 * Pure provider-precedence decision (no fs/env) — unit tested.
 * Subscription first (free, what you have locally). OpenAI next (the portable
 * key that makes Vercel "just work"). Then the paid Anthropic key. Then none.
 */
export function resolveProvider(i: {
  claudeSubscription: boolean; // token OR local session
  hasOpenAI: boolean;
  hasAnthropicKey: boolean;
}): AiProvider {
  if (i.claudeSubscription) return "claude-subscription";
  if (i.hasOpenAI) return "openai";
  if (i.hasAnthropicKey) return "claude-api";
  return "none";
}

export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o";

export function detectConnections(): Connections {
  const hasOAuthToken = !!process.env.CLAUDE_CODE_OAUTH_TOKEN;
  const sub = hasOAuthToken ? { ok: true } : detectClaudeSubscription();
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  const hasGemini = !!process.env.GEMINI_API_KEY || !!process.env.GOOGLE_GEMINI_API_KEY;

  const provider = resolveProvider({
    claudeSubscription: sub.ok,
    hasOpenAI,
    hasAnthropicKey,
  });

  const providerLabel =
    provider === "claude-subscription" ? "Claude Pro / Max (subscription)"
    : provider === "openai" ? `OpenAI (${OPENAI_MODEL})`
    : provider === "claude-api" ? "Claude (API key)"
    : "Not connected";

  // Legacy shape for the existing Connections UI.
  const auth: ClaudeAuth =
    provider === "claude-subscription" ? "subscription"
    : provider === "none" ? "none"
    : "api-key";

  const boardRepo =
    process.env.GITHUB_TOKEN && process.env.GITHUB_BOARD_REPO
      ? process.env.GITHUB_BOARD_REPO
      : undefined;

  return {
    provider,
    providerLabel,
    claude: { available: provider !== "none", auth, accountHint: sub.accountHint },
    gemini: { available: hasGemini },
    googleFlow: { programmatic: hasGemini },
    board: { configured: !!boardRepo, repo: boardRepo },
  };
}
