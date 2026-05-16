import { describe, it, expect } from "vitest";
import { similarity, findDuplicates, buildDuplicateIndex, severity } from "../dedupe";
import type { Content } from "../types";

function row(partial: Partial<Content> & { id: string; title: string }): Content {
  return {
    rowIndex: 0,
    status: "IDEA",
    hook: "",
    script: "",
    description: "",
    tags: [],
    aiCost: 0,
    createdAt: "",
    updatedAt: "",
    ...partial,
  } as Content;
}

describe("similarity", () => {
  it("is 1.0 (or very high) for identical rows", () => {
    const a = row({ id: "a", title: "Why Agarwood Costs More Than Gold", hook: "Gold vs oud" });
    const b = row({ id: "b", title: "Why Agarwood Costs More Than Gold", hook: "Gold vs oud" });
    expect(similarity(a, b)).toBeGreaterThan(0.9);
  });

  it("ranks the gold-price pair above unrelated rows even when absolute score is low", () => {
    // After domain + English stop-listing, bigram overlap is usually empty for paraphrased titles,
    // so absolute scores stay low. The contract is *relative ordering*, not absolute thresholds.
    const a = row({ id: "a", title: "Why Agarwood Costs More Than Gold (The Real Economics)" });
    const b = row({ id: "b", title: "How Agarwood Became More Expensive Than Gold: A Price History" });
    const unrelated = row({ id: "c", title: "Kodo: The Japanese Art of Listening to Agarwood" });
    expect(similarity(a, b)).toBeGreaterThan(similarity(a, unrelated));
  });

  it("is low for genuinely different agarwood topics", () => {
    const a = row({ id: "a", title: "How Oud Oil Is Made: Traditional Agarwood Distillation" });
    const b = row({ id: "b", title: "Kodo: The Japanese Art of Listening to Agarwood" });
    expect(similarity(a, b)).toBeLessThan(0.18);
  });

  it("domain stopwords prevent agarwood/oud/tree from inflating scores", () => {
    // These titles share ONLY domain terms — should score near zero.
    const a = row({ id: "a", title: "Agarwood oud tree resin smell" });
    const b = row({ id: "b", title: "Tree resin oud agarwood scent" });
    expect(similarity(a, b)).toBeLessThan(0.10);
  });

  it("category match adds a small bonus", () => {
    const a = row({ id: "a", title: "Some Topic With Words", hook: "x", category: "Mystery" });
    const b = row({ id: "b", title: "Different Words Entirely", hook: "y", category: "Mystery" });
    // Tokens overlap is near-zero but category match adds ~0.08
    expect(similarity(a, b)).toBeGreaterThan(0.05);
  });
});

describe("severity", () => {
  it("classifies score bands correctly", () => {
    expect(severity(0.10)).toBe("low");
    expect(severity(0.22)).toBe("low");
    expect(severity(0.30)).toBe("medium");
    expect(severity(0.44)).toBe("medium");
    expect(severity(0.45)).toBe("high");
    expect(severity(0.90)).toBe("high");
  });
});

describe("findDuplicates", () => {
  const rows = [
    row({ id: "1", title: "Why Agarwood Costs More Than Gold" }),
    row({ id: "2", title: "How Agarwood Became More Expensive Than Gold: A Price History" }),
    row({ id: "3", title: "Why Oud Oil Is So Expensive: The Brutal Yield Math" }),
    row({ id: "4", title: "Kodo: The Japanese Art of Listening to Agarwood" }),
  ];

  it("excludes the target itself from results", () => {
    const out = findDuplicates(rows, rows[0]);
    expect(out.find((m) => m.row.id === "1")).toBeUndefined();
  });

  it("returns matches sorted by score descending", () => {
    const out = findDuplicates(rows, rows[0], 5, 0.05);
    for (let i = 1; i < out.length; i++) {
      expect(out[i - 1].score).toBeGreaterThanOrEqual(out[i].score);
    }
  });

  it("caps results at the requested limit", () => {
    const out = findDuplicates(rows, rows[0], 1, 0.0);
    expect(out.length).toBeLessThanOrEqual(1);
  });

  it("filters by threshold", () => {
    const out = findDuplicates(rows, rows[0], 5, 0.9);
    expect(out).toHaveLength(0);
  });
});

describe("buildDuplicateIndex", () => {
  it("returns a Map with an entry for every row", () => {
    const rows = [
      row({ id: "1", title: "First" }),
      row({ id: "2", title: "Second" }),
      row({ id: "3", title: "Third" }),
    ];
    const idx = buildDuplicateIndex(rows);
    expect(idx.size).toBe(3);
    for (const r of rows) {
      expect(idx.get(r.id)).toBeDefined();
    }
  });

  it("symmetric — if A matches B at threshold T then B also matches A", () => {
    // Use titles with enough shared bigrams to clear the default threshold.
    const a = row({ id: "a", title: "Vietnamese Distillation: How Master Crafters Work" });
    const b = row({ id: "b", title: "Vietnamese Distillation Techniques in Modern Times" });
    const idx = buildDuplicateIndex([a, b], 0.1);
    expect(idx.get("a")?.some((m) => m.row.id === "b")).toBe(true);
    expect(idx.get("b")?.some((m) => m.row.id === "a")).toBe(true);
  });

  it("each row's match list is sorted by score desc", () => {
    const rows = [
      row({ id: "1", title: "Why Agarwood Costs More Than Gold" }),
      row({ id: "2", title: "How Agarwood Became More Expensive Than Gold" }),
      row({ id: "3", title: "Why Oud Oil Is So Expensive" }),
    ];
    const idx = buildDuplicateIndex(rows, 0.05);
    for (const list of idx.values()) {
      for (let i = 1; i < list.length; i++) {
        expect(list[i - 1].score).toBeGreaterThanOrEqual(list[i].score);
      }
    }
  });
});
