/**
 * Discipline tests on the brand / compliance source-of-truth.
 * If any of these break, the channel guardrails are at risk.
 */
import { describe, it, expect } from "vitest";
import {
  BRAND, SPECIES, PRODUCTION, NEVER_SAY, ALWAYS_FRAME, ANIMATION, CTA,
  SOURCE_MAP, BASELINE_TAGS, PRODUCT,
} from "../project-config";

describe("BRAND constants", () => {
  it("uses the Daracheon / Zoell Life identity from the training PDF", () => {
    expect(BRAND.brand).toMatch(/Daracheon/);
    expect(BRAND.brand).toMatch(/다라천/);
    expect(BRAND.company).toMatch(/Zoell Life/);
    expect(BRAND.site).toBe("zoellife.com");
  });

  it("includes the Korean tagline verbatim", () => {
    expect(BRAND.tagline).toBe("가짜가 많을수록, 진짜는 드러난다");
  });
});

describe("SPECIES", () => {
  it("uses the legally recognized Korean Pharmacopoeia species name", () => {
    expect(SPECIES.scientific).toBe("Aquilaria Agallocha Roxburgh");
    expect(SPECIES.registration).toMatch(/Korean Pharmacopoeia/);
  });
});

describe("PRODUCTION", () => {
  it("has the six-stage build process", () => {
    expect(PRODUCTION.stages.length).toBe(6);
    expect(PRODUCTION.stages[0].what).toMatch(/Seed germination/);
    expect(PRODUCTION.stages[5].what).toMatch(/distillation/);
  });

  it("certifications include the full CITES/HACCP/GMP/Organic/MFDS stack", () => {
    const names = PRODUCTION.certifications.map((c) => c.name);
    expect(names).toContain("CITES");
    expect(names).toContain("HACCP");
    expect(names).toContain("GMP");
    expect(names).toContain("Organic");
    expect(names).toContain("Korean MFDS");
  });
});

describe("NEVER_SAY guardrails", () => {
  it("includes the four PDF-mandated bans", () => {
    const phrases = NEVER_SAY.map((n) => n.phrase.toLowerCase());
    expect(phrases.some((p) => p.includes("cures cancer"))).toBe(true);
    expect(phrases.some((p) => p.includes("replaces your medication"))).toBe(true);
    expect(phrases.some((p) => p.includes("wild-harvested") || p.includes("ancient tree"))).toBe(true);
    expect(phrases.some((p) => p.includes("dosage"))).toBe(true);
  });

  it("every NEVER_SAY entry has a non-empty reason", () => {
    for (const n of NEVER_SAY) expect(n.reason.length).toBeGreaterThan(10);
  });
});

describe("ALWAYS_FRAME", () => {
  it("requires the 'traditionally used for…' framing", () => {
    expect(ALWAYS_FRAME.some((s) => s.toLowerCase().includes("traditionally used"))).toBe(true);
  });

  it("requires the functional-food (건강기능식품) lane, not 의약품", () => {
    expect(ALWAYS_FRAME.some((s) => s.includes("건강기능식품"))).toBe(true);
  });
});

describe("ANIMATION rule", () => {
  it("specifies cartoon + faceless characters", () => {
    expect(ANIMATION.style.toLowerCase()).toMatch(/cartoon/);
    expect(ANIMATION.style.toLowerCase()).toMatch(/faceless/);
  });

  it("emphasizes factual accuracy", () => {
    expect(ANIMATION.rule.toLowerCase()).toMatch(/factual|accurate/);
  });
});

describe("CTA block", () => {
  it("uses the verified species name and Hà Tĩnh provenance", () => {
    expect(CTA.pinnedComment).toMatch(/Aquilaria Agallocha Roxburgh/);
    expect(CTA.pinnedComment).toMatch(/Hà Tĩnh/);
  });

  it("includes the full certification stack", () => {
    expect(CTA.pinnedComment).toMatch(/CITES/);
    expect(CTA.pinnedComment).toMatch(/HACCP/);
    expect(CTA.pinnedComment).toMatch(/GMP/);
    expect(CTA.pinnedComment).toMatch(/Organic/);
    expect(CTA.pinnedComment).toMatch(/MFDS/);
  });

  it("includes the supplement disclaimer (no diagnose/treat/cure/prevent)", () => {
    expect(CTA.pinnedComment.toLowerCase()).toMatch(/not medical advice|not intended to/);
  });
});

describe("SOURCE_MAP", () => {
  it("has entries for all four tracks", () => {
    for (const t of ["A", "B", "C", "D"] as const) {
      expect(SOURCE_MAP[t]).toBeDefined();
      expect(SOURCE_MAP[t].sources.length).toBeGreaterThan(0);
    }
  });

  it("Track A points to peer-reviewed science domains", () => {
    const joined = SOURCE_MAP.A.sources.join(" ").toLowerCase();
    expect(joined).toMatch(/pubmed|pmc|mdpi|sciencedirect/);
  });
});

describe("BASELINE_TAGS", () => {
  it("includes the channel monetization tags", () => {
    expect(BASELINE_TAGS).toContain("Daracheon");
    expect(BASELINE_TAGS).toContain("다라천");
    expect(BASELINE_TAGS.map((t) => t.toLowerCase())).toContain("zoell life");
  });

  it("includes the bilingual species/topic tags", () => {
    expect(BASELINE_TAGS).toContain("agarwood");
    expect(BASELINE_TAGS).toContain("침향");
  });
});

describe("PRODUCT benefits", () => {
  it("uses prevention framing (not cure) for brain-health", () => {
    const brain = PRODUCT.benefits.find((b) => b.en.toLowerCase().includes("brain"));
    expect(brain).toBeDefined();
    expect(brain!.en.toLowerCase()).not.toMatch(/cure/);
  });
});
