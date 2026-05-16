import { describe, it, expect } from "vitest";
import { preflight, canPublish } from "../seo-preflight";
import type { SeoMeta } from "../types";

const GOOD: SeoMeta = {
  title: "What Happens Inside a Wounded Agarwood Tree (First 14 Days)",
  description:
    "Cut this tree and a chemical emergency starts within minutes — the real 14-day science.\n\n" +
    "Daracheon True Agarwood by Zoell Life. https://zoellife.com\n\n" +
    "Traditional use only. Not medical advice. Consult a healthcare professional.",
  tags: ["agarwood", "oud", "침향", "aquilaria", "agarwood formation", "oud science", "resin", "sesquiterpenes"],
  hashtags: ["#agarwood", "#oud", "#침향"],
  chapters: [
    { time: "00:00", label: "The wound" },
    { time: "00:55", label: "The chemistry" },
    { time: "02:10", label: "More" },
  ],
};

describe("preflight — clean metadata", () => {
  const checks = preflight(GOOD);
  it("passes compliance, title, disclaimer, sponsor", () => {
    const by = Object.fromEntries(checks.map((c) => [c.id, c.level]));
    expect(by.compliance).toBe("pass");
    expect(by.title).toBe("pass");
    expect(by.disclaimer).toBe("pass");
    expect(by.sponsor).toBe("pass");
    expect(by.chapters).toBe("pass");
  });
  it("is publishable", () => {
    expect(canPublish(checks)).toBe(true);
  });
});

describe("preflight — banned phrase", () => {
  it("fails compliance when a NEVER_SAY phrase appears in the description", () => {
    const bad: SeoMeta = { ...GOOD, description: GOOD.description + " This cures cancer in weeks." };
    const checks = preflight(bad);
    const c = checks.find((x) => x.id === "compliance")!;
    expect(c.level).toBe("fail");
    expect(c.detail?.toLowerCase()).toContain("cures cancer");
    expect(canPublish(checks)).toBe(false);
  });

  it("catches banned phrase in tags too", () => {
    const bad: SeoMeta = { ...GOOD, tags: [...GOOD.tags, "wild-harvested oud"] };
    const checks = preflight(bad);
    expect(checks.find((x) => x.id === "compliance")!.level).toBe("fail");
  });
});

describe("preflight — title length", () => {
  it("fails when title > 70 chars", () => {
    const bad: SeoMeta = { ...GOOD, title: "x".repeat(71) };
    expect(preflight(bad).find((c) => c.id === "title")!.level).toBe("fail");
  });
  it("fails when title empty", () => {
    const bad: SeoMeta = { ...GOOD, title: "  " };
    expect(preflight(bad).find((c) => c.id === "title")!.level).toBe("fail");
  });
});

describe("preflight — disclaimer / sponsor", () => {
  it("fails when disclaimer missing", () => {
    const bad: SeoMeta = { ...GOOD, description: "Just a description with Daracheon but no disclaimer." };
    expect(preflight(bad).find((c) => c.id === "disclaimer")!.level).toBe("fail");
  });
  it("warns (not fails) when sponsor disclosure missing", () => {
    const bad: SeoMeta = { ...GOOD, description: "Science only. Not medical advice. Traditional use only." };
    const c = preflight(bad).find((x) => x.id === "sponsor")!;
    expect(c.level).toBe("warn");
    // a warn alone should not block publishing
    expect(canPublish(preflight(bad).filter((x) => x.id !== "compliance" ? true : true))).toBe(true);
  });
});

describe("preflight — chapters", () => {
  it("fails when first chapter isn't 00:00", () => {
    const bad: SeoMeta = { ...GOOD, chapters: [{ time: "00:30", label: "Late start" }] };
    expect(preflight(bad).find((c) => c.id === "chapters")!.level).toBe("fail");
  });
  it("warns when no chapters", () => {
    const bad: SeoMeta = { ...GOOD, chapters: [] };
    expect(preflight(bad).find((c) => c.id === "chapters")!.level).toBe("warn");
  });
});

describe("canPublish", () => {
  it("blocks on any fail, allows with only warnings", () => {
    expect(canPublish([{ id: "a", label: "", level: "pass" }, { id: "b", label: "", level: "warn" }])).toBe(true);
    expect(canPublish([{ id: "a", label: "", level: "fail" }])).toBe(false);
  });
});
