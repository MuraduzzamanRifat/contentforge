import { describe, it, expect } from "vitest";
import { cn, uid, formatCost, formatDate } from "../utils";

describe("cn", () => {
  it("merges class strings", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("dedupes conflicting Tailwind classes (twMerge)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("handles falsy values", () => {
    expect(cn("a", false && "b", null, undefined, "c")).toBe("a c");
  });

  it("conditional class via object", () => {
    expect(cn("base", { active: true, hidden: false })).toContain("base");
    expect(cn("base", { active: true, hidden: false })).toContain("active");
    expect(cn("base", { active: true, hidden: false })).not.toContain("hidden");
  });
});

describe("uid", () => {
  it("returns a string with the given prefix", () => {
    expect(uid("row")).toMatch(/^row_/);
    expect(uid()).toMatch(/^c_/);
  });

  it("returns unique values across calls", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) seen.add(uid());
    expect(seen.size).toBe(200);
  });
});

describe("formatCost", () => {
  it("returns dash for zero", () => {
    expect(formatCost(0)).toBe("—");
  });

  it("formats positive amounts to 3 decimals with leading $", () => {
    expect(formatCost(0.041)).toBe("$0.041");
    expect(formatCost(1.5)).toBe("$1.500");
  });
});

describe("formatDate", () => {
  it("returns dash for null/undefined", () => {
    expect(formatDate(undefined)).toBe("—");
    expect(formatDate(null)).toBe("—");
  });

  it("returns a non-empty short date for a valid ISO string", () => {
    const out = formatDate("2026-05-14T00:00:00.000Z");
    expect(out).not.toBe("—");
    expect(out.length).toBeGreaterThan(0);
  });
});
