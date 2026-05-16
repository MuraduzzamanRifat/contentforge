import { describe, it, expect } from "vitest";
import { resolveClaudeAuth } from "../providers";

describe("resolveClaudeAuth — precedence", () => {
  it("CLAUDE_CODE_OAUTH_TOKEN wins → subscription (headless self-host, no API cost)", () => {
    expect(
      resolveClaudeAuth({ hasOAuthToken: true, subscriptionSession: false, hasApiKey: false })
    ).toBe("subscription");
    // even if an API key is also present, the token (subscription) is preferred
    expect(
      resolveClaudeAuth({ hasOAuthToken: true, subscriptionSession: false, hasApiKey: true })
    ).toBe("subscription");
  });

  it("local Claude Code session → subscription", () => {
    expect(
      resolveClaudeAuth({ hasOAuthToken: false, subscriptionSession: true, hasApiKey: false })
    ).toBe("subscription");
  });

  it("only ANTHROPIC_API_KEY → api-key (paid)", () => {
    expect(
      resolveClaudeAuth({ hasOAuthToken: false, subscriptionSession: false, hasApiKey: true })
    ).toBe("api-key");
  });

  it("nothing configured → none (AI routes return honest 412)", () => {
    expect(
      resolveClaudeAuth({ hasOAuthToken: false, subscriptionSession: false, hasApiKey: false })
    ).toBe("none");
  });
});
