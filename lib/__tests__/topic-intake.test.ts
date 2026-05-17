import { describe, it, expect } from "vitest";
import { assessTopic } from "../topic-intake";
import { scanBanned } from "../seo-preflight";
import type { TopicDraft } from "../prompts/topics";
import type { Content } from "../types";

const draft = (p: Partial<TopicDraft>): TopicDraft => ({
  title: "How Resin Density Sets Agarwood Grade",
  hook: "One physical property explains most of the price.",
  track: "A",
  category: "Grading",
  script: "Hook: … Proof: density vs resin saturation … CTA: …",
  sources: ["https://pmc.ncbi.nlm.nih.gov/"],
  ...p,
});

const corpusRow = (title: string): Content =>
  ({
    id: title, rowIndex: 0, status: "IDEA", title, hook: "", script: "",
    description: "", tags: [], aiCost: 0, createdAt: "", updatedAt: "",
  } as Content);

describe("scanBanned (shared with publish preflight)", () => {
  it("flags NEVER_SAY phrases anywhere in text", () => {
    expect(scanBanned("This is wild-harvested from an ancient tree")).toContain("wild-harvested");
    expect(scanBanned("totally clean copy about resin chemistry")).toHaveLength(0);
  });
});

describe("assessTopic", () => {
  it("passes a clean, distinct topic", () => {
    const c = assessTopic(draft({}), "id1", [corpusRow("Completely unrelated incense history")]);
    expect(c.compliance.level).toBe("ok");
    expect(c.compliance.hits).toHaveLength(0);
    expect(c.duplicate).toBeNull();
    expect(c.id).toBe("id1");
  });

  it("flags a banned phrase in the script", () => {
    const c = assessTopic(
      draft({ script: "We use only wild-harvested wood from an ancient tree." }),
      "id2",
      [],
    );
    expect(c.compliance.level).toBe("flag");
    expect(c.compliance.hits.join(" ")).toMatch(/wild-harvested/);
  });

  it("detects a near-duplicate of an existing planned topic", () => {
    const c = assessTopic(
      draft({ title: "How Resin Density Sets Agarwood Grade" }),
      "id3",
      [corpusRow("How Resin Density Sets the Agarwood Grade")],
    );
    expect(c.duplicate).not.toBeNull();
    expect(["medium", "high"]).toContain(c.duplicate!.severity);
  });
});
