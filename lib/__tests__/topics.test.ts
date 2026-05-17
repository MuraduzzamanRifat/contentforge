import { describe, it, expect } from "vitest";
import {
  parseTopics, buildTopicsSystemPrompt, buildTopicsUserMessage,
} from "../prompts/topics";

const ITEM = {
  title: "Why Agarwood Sinks",
  hook: "Real agarwood does the opposite of what wood should.",
  track: "A",
  category: "Grading",
  script: "Hook: … Proof: … CTA: …",
  sources: ["https://pmc.ncbi.nlm.nih.gov/articles/PMC6271187/"],
};

describe("parseTopics", () => {
  it("parses a clean JSON array", () => {
    const out = parseTopics(JSON.stringify([ITEM, { ...ITEM, title: "Second" }]));
    expect(out).toHaveLength(2);
    expect(out[0].title).toBe("Why Agarwood Sinks");
    expect(out[0].track).toBe("A");
  });

  it("tolerates code fences and prose around the array", () => {
    const wrapped = "Sure! Here you go:\n```json\n" + JSON.stringify([ITEM]) + "\n```\nDone.";
    expect(parseTopics(wrapped)).toHaveLength(1);
  });

  it("coerces an invalid track to D and defaults category", () => {
    const out = parseTopics(JSON.stringify([{ ...ITEM, track: "Z", category: "" }]));
    expect(out[0].track).toBe("D");
    expect(out[0].category).toBe("General");
  });

  it("skips items missing title or script", () => {
    const out = parseTopics(JSON.stringify([ITEM, { hook: "x" }, { ...ITEM, script: "" }]));
    expect(out).toHaveLength(1);
  });

  it("throws when there is no array / nothing usable", () => {
    expect(() => parseTopics("no json here")).toThrow(/no JSON array/);
    expect(() => parseTopics("[]")).toThrow(/no usable topics/);
    expect(() => parseTopics("[not json]")).toThrow(/not valid JSON/);
  });
});

describe("topic prompt builders", () => {
  it("system prompt embeds compliance + JSON schema", () => {
    const p = buildTopicsSystemPrompt();
    expect(p).toMatch(/Daracheon/);
    expect(p).toMatch(/never appear/i);          // never_say rule
    expect(p).toMatch(/"track": "A" \| "B" \| "C" \| "D"/);
    expect(p).toMatch(/JSON array/);
  });

  it("user message carries count + avoid list", () => {
    const m = buildTopicsUserMessage(3, ["Existing topic one", "Existing topic two"]);
    expect(m).toMatch(/COUNT = 3/);
    expect(m).toMatch(/- Existing topic one/);
    expect(m).toMatch(/- Existing topic two/);
  });

  it("user message handles an empty avoid list", () => {
    expect(buildTopicsUserMessage(5, [])).toMatch(/none yet/);
  });
});
