import { describe, it, expect } from "vitest";
import { buildUserMessage } from "../prompts/script-user";
import type { Content } from "../types";

function row(p: Partial<Content> & { title: string }): Content {
  return {
    id: p.title.toLowerCase().replace(/\s+/g, "_"),
    rowIndex: 0, status: "IDEA", hook: "", script: "", description: "",
    tags: [], aiCost: 0, createdAt: "", updatedAt: "",
    ...p,
  } as Content;
}

describe("buildUserMessage", () => {
  const target = {
    title: "Why Agarwood Costs More Than Gold (Real Economics)",
    hook: "Put it on a scale against gold and the wood wins.",
    brief: "Topic: Why a kilo of Kyara beats a kilo of gold",
    category: "Economy",
    track: "D" as const,
    visualStyle: "Auction-house elegance",
    weekIndex: 1,
    publishSlot: "Sun" as const,
  };

  it("includes the target row metadata", () => {
    const msg = buildUserMessage({ target, all: [] });
    expect(msg).toContain(target.title);
    expect(msg).toContain(target.hook);
    expect(msg).toContain("Economy");
    expect(msg).toContain("D (Wildcard)");
    expect(msg).toContain("Week 1 · Sun");
    expect(msg).toContain("Auction-house elegance");
  });

  it("contains <row> and <avoid_overlap> XML tags for Claude recall", () => {
    const msg = buildUserMessage({ target, all: [] });
    expect(msg).toContain("<row>");
    expect(msg).toContain("</row>");
    expect(msg).toContain("<avoid_overlap>");
    expect(msg).toContain("</avoid_overlap>");
  });

  it("when no other rows exist, the avoid_overlap block reads 'none'", () => {
    const msg = buildUserMessage({ target, all: [] });
    expect(msg).toMatch(/avoid_overlap[\s\S]*\(none/i);
  });

  it("when overlapping rows exist, they appear in the avoid_overlap block with %", () => {
    // Use a near-duplicate sibling so bigrams clearly overlap and clear the 0.18 threshold.
    const overlapTarget = {
      ...target,
      title: "How Vietnamese Master Distillers Work in Modern Times",
      hook: "Modern Vietnamese masters making oil",
    };
    const sibling = row({
      title: "How Vietnamese Master Distillers Work in 2026",
      hook: "Modern Vietnamese masters making oil",
      weekIndex: 36,
      publishSlot: "Wed",
      track: "B",
    });
    const msg = buildUserMessage({ target: overlapTarget, all: [sibling] });
    expect(msg).toContain("W36·Wed");
    expect(msg).toContain("Vietnamese Master Distillers");
    expect(msg).toMatch(/\d+% lexical overlap/);
  });

  it("omits unrelated rows from the avoid_overlap list", () => {
    const unrelated = row({ title: "Kodo: The Japanese Art of Listening to Agarwood", track: "C" });
    const msg = buildUserMessage({ target, all: [unrelated] });
    expect(msg).not.toContain("Kodo");
  });

  it("track letter maps to the human-readable name", () => {
    const msg = buildUserMessage({ target: { ...target, track: "A" }, all: [] });
    expect(msg).toContain("A (Science & The Tree)");
  });
});
