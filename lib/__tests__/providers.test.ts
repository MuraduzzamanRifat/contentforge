import { describe, it, expect } from "vitest";
import { resolveProvider } from "../providers";

describe("resolveProvider — precedence", () => {
  it("Claude subscription wins (free, local self-host)", () => {
    expect(
      resolveProvider({ claudeSubscription: true, hasOpenAI: false, hasAnthropicKey: false })
    ).toBe("claude-subscription");
    // even if OpenAI + Anthropic keys are also set, the free subscription is preferred
    expect(
      resolveProvider({ claudeSubscription: true, hasOpenAI: true, hasAnthropicKey: true })
    ).toBe("claude-subscription");
  });

  it("no Claude session + OPENAI_API_KEY → openai (the Vercel path)", () => {
    expect(
      resolveProvider({ claudeSubscription: false, hasOpenAI: true, hasAnthropicKey: false })
    ).toBe("openai");
    // OpenAI preferred over the paid Anthropic key
    expect(
      resolveProvider({ claudeSubscription: false, hasOpenAI: true, hasAnthropicKey: true })
    ).toBe("openai");
  });

  it("only ANTHROPIC_API_KEY → claude-api (paid)", () => {
    expect(
      resolveProvider({ claudeSubscription: false, hasOpenAI: false, hasAnthropicKey: true })
    ).toBe("claude-api");
  });

  it("nothing configured → none (AI routes return honest 412)", () => {
    expect(
      resolveProvider({ claudeSubscription: false, hasOpenAI: false, hasAnthropicKey: false })
    ).toBe("none");
  });
});
