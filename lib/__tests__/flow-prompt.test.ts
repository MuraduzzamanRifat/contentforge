import { describe, it, expect } from "vitest";
import { buildFlowPrompt } from "../flow-prompt";
import type { Content } from "../types";

function row(p: Partial<Content>): Content {
  return {
    id: "x", rowIndex: 0, status: "IDEA", title: "", hook: "",
    script: "", description: "", tags: [], aiCost: 0,
    createdAt: "", updatedAt: "",
    ...p,
  } as Content;
}

describe("buildFlowPrompt", () => {
  it("always includes the channel animation rule", () => {
    const out = buildFlowPrompt(row({ title: "X", hook: "y" }));
    expect(out).toContain("Cartoon");
    expect(out.toLowerCase()).toContain("faceless");
  });

  it("includes title, hook, and visualStyle when present", () => {
    const out = buildFlowPrompt(
      row({ title: "Why XAU broke 2400", hook: "Gold just punched through", visualStyle: "Macro, raking light" })
    );
    expect(out).toContain("Why XAU broke 2400");
    expect(out).toContain("Gold just punched through");
    expect(out).toContain("Macro, raking light");
  });

  it("omits SHOT/SUBJECT/OPENING BEAT lines when the field is empty", () => {
    const out = buildFlowPrompt(row({ title: "", hook: "", visualStyle: undefined }));
    expect(out).not.toContain("SHOT:");
    expect(out).not.toContain("SUBJECT:");
    expect(out).not.toContain("OPENING BEAT:");
  });

  it("contains AVOID guardrails (no wild-harvest, no faces)", () => {
    const out = buildFlowPrompt(row({ title: "x" }));
    expect(out.toLowerCase()).toContain("avoid");
    expect(out.toLowerCase()).toContain("wild-harvest");
  });
});
