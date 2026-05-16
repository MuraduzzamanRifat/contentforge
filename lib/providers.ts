/**
 * Provider connection detection (server-only).
 *
 * Three Claude auth paths, in priority order:
 *  1. Claude Pro/Max subscription via Claude Code session  — preferred (uses your subscription quota)
 *  2. ANTHROPIC_API_KEY                                    — fallback (paid per call)
 *  3. None                                                 — UI disables AI features
 *
 * Plus one Google path:
 *  - GEMINI_API_KEY for Veo 3 / Gemini text generation     — programmatic Google Flow alternative
 *
 * (Google Flow itself — flow.google.com — has no public API yet, so we fall back to
 * "copy prompt + open Flow in a tab" for that workflow.)
 */

import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type ClaudeAuth = "subscription" | "api-key" | "none";

export interface Connections {
  claude: {
    available: boolean;
    auth: ClaudeAuth;
    /** Email/account hint if we can detect one from the Claude Code session. */
    accountHint?: string;
  };
  gemini: {
    available: boolean;
  };
  googleFlow: {
    /** True if we have a Gemini key (programmatic Veo). Otherwise UI uses open-in-tab fallback. */
    programmatic: boolean;
  };
}

function detectClaudeSubscription(): { ok: boolean; accountHint?: string } {
  // Claude Code stores creds under ~/.claude/ — both Windows (C:\Users\<u>\.claude) and *nix.
  // We don't read tokens (they're keyring-stored on most platforms); we just detect a working
  // session by the presence of the directory + config.
  try {
    const dir = join(homedir(), ".claude");
    if (!existsSync(dir)) return { ok: false };
    const entries = readdirSync(dir);
    // Strong signal: settings.json exists. Account hint: scan projects dir name.
    if (entries.includes("settings.json")) {
      return { ok: true, accountHint: undefined };
    }
    return { ok: false };
  } catch {
    return { ok: false };
  }
}

export function detectConnections(): Connections {
  const sub = detectClaudeSubscription();
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
  const hasGemini = !!process.env.GEMINI_API_KEY || !!process.env.GOOGLE_GEMINI_API_KEY;

  const auth: ClaudeAuth = sub.ok ? "subscription" : hasApiKey ? "api-key" : "none";

  return {
    claude: {
      available: auth !== "none",
      auth,
      accountHint: sub.accountHint,
    },
    gemini: { available: hasGemini },
    googleFlow: { programmatic: hasGemini },
  };
}
