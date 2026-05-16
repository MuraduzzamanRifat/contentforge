import { describe, it, expect } from "vitest";
import { isBlankBoard } from "../store";
import { seedClone } from "../agarwood-plan";
import type { Content } from "../types";

function row(p: Partial<Content>): Content {
  return {
    id: "r", rowIndex: 0, status: "IDEA", title: "", hook: "",
    script: "", description: "", tags: [], aiCost: 0,
    createdAt: "", updatedAt: "",
    ...p,
  } as Content;
}

// Regression: a stale/empty localStorage board must never shadow the 260-row
// seed (the "only one blank row instead of the plan" bug).
describe("isBlankBoard", () => {
  it("treats undefined / empty as blank (fresh deploy → seed)", () => {
    expect(isBlankBoard(undefined)).toBe(true);
    expect(isBlankBoard([])).toBe(true);
  });

  it("treats a single untitled IDEA stub as blank", () => {
    expect(isBlankBoard([row({})])).toBe(true);
    expect(isBlankBoard([row({ title: "   " })])).toBe(true);
  });

  it("is NOT blank when any row carries real content", () => {
    expect(isBlankBoard([row({ title: "Why oud smells like that" })])).toBe(false);
    expect(isBlankBoard([row({ hook: "In 30 seconds…" })])).toBe(false);
    expect(isBlankBoard([row({ script: "Scene 1 …" })])).toBe(false);
    expect(isBlankBoard([row({}), row({ title: "Real topic" })])).toBe(false);
  });

  it("is NOT blank when a row has moved past IDEA", () => {
    expect(isBlankBoard([row({ status: "DRAFT" })])).toBe(false);
  });

  it("the 260-row seed is never considered blank", () => {
    const seed = seedClone();
    expect(seed.length).toBe(260);
    expect(isBlankBoard(seed)).toBe(false);
  });
});
