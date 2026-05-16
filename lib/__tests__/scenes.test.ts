import { describe, it, expect } from "vitest";
import { parseScenes, extractAnimationDirection, extractOnScreenText } from "../scenes";

const FULL_SCRIPT = `1) ANIMATION DIRECTION
Cartoon 2D, faceless OK. Must-verify: hormone names, 14-day timeline.

2) FACT SOURCES
[1] Liu Y. et al., Molecules 2013 — https://pmc.ncbi.nlm.nih.gov/articles/PMC6271187/
[2] Naef R., Flavour & Fragrance Journal 2011

3) SCRIPT
- Hook (0:00–0:08): Cut this tree and a chemical emergency starts within minutes.
- Cold-open (0:08–0:25): The wound is small. The response is not.
- Problem (0:25–0:55): For thousands of years no one knew why.
- Proof (0:55–1:45): Calcium floods the cut [1]. Hormones rise [1]. Chromones by day 14 [2].
- Synthesis (1:45–2:10): The wound is the trigger, not the cause.
- CTA (2:10–2:30): Curious where to find verified agarwood?

4) ON-SCREEN TEXT
- "Aquilaria spp. — agarwood-producing genus" [1]
- "Day 14: 2-(2-phenylethyl)chromones detected" [2]

5) YOUTUBE DESCRIPTION
What Happens Inside a Wounded Agarwood Tree...`;

describe("parseScenes — full 5-section script", () => {
  const scenes = parseScenes(FULL_SCRIPT);

  it("extracts exactly the 6 time-coded beats", () => {
    expect(scenes.map((s) => s.label)).toEqual([
      "Hook", "Cold-open", "Problem", "Proof", "Synthesis", "CTA",
    ]);
  });

  it("captures start/end timecodes and beat text", () => {
    expect(scenes[0]).toMatchObject({ start: "0:00", end: "0:08" });
    expect(scenes[0].text).toMatch(/chemical emergency/);
    expect(scenes[5]).toMatchObject({ label: "CTA", start: "2:10", end: "2:30" });
  });

  it("gives every scene a unique id", () => {
    const ids = scenes.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("does NOT pull beats from the ON-SCREEN TEXT or DESCRIPTION sections", () => {
    expect(scenes.some((s) => s.text.includes("Aquilaria spp."))).toBe(false);
    expect(scenes.length).toBe(6);
  });
});

describe("parseScenes — edge cases", () => {
  it("returns [] for empty input", () => {
    expect(parseScenes("")).toEqual([]);
    expect(parseScenes("   ")).toEqual([]);
  });

  it("collapses a free-form script (no time codes) to one 'Full video' scene", () => {
    const s = parseScenes("Just a paragraph about agarwood with no timecodes at all.");
    expect(s).toHaveLength(1);
    expect(s[0].label).toBe("Full video");
    expect(s[0].text).toMatch(/paragraph about agarwood/);
  });

  it("accepts hyphen, en-dash, and em-dash range separators", () => {
    const s = parseScenes("- Hook (0:00-0:08): a\n- Beat (0:08–0:20): b\n- End (0:20—0:30): c");
    expect(s.map((x) => x.label)).toEqual(["Hook", "Beat", "End"]);
  });

  it("folds continuation lines into the current beat", () => {
    const s = parseScenes("3) SCRIPT\n- Proof (0:55–1:45): first line\n  still proof, second line\n- CTA (2:10–2:30): done");
    const proof = s.find((x) => x.label === "Proof")!;
    expect(proof.text).toMatch(/first line/);
    expect(proof.text).toMatch(/second line/);
    expect(s).toHaveLength(2);
  });

  it("works without the literal '3) SCRIPT' header (beats anywhere)", () => {
    const s = parseScenes("- Hook (0:00–0:05): x\n- Outro (0:05–0:10): y");
    expect(s).toHaveLength(2);
  });
});

describe("extractAnimationDirection", () => {
  it("returns the first non-empty line under the header", () => {
    expect(extractAnimationDirection(FULL_SCRIPT)).toMatch(/Cartoon 2D, faceless OK/);
  });
  it("returns null when the section is absent", () => {
    expect(extractAnimationDirection("no sections here")).toBeNull();
  });
});

describe("extractOnScreenText", () => {
  it("returns the bullet items, stopping at YOUTUBE DESCRIPTION", () => {
    const items = extractOnScreenText(FULL_SCRIPT);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatch(/Aquilaria spp/);
    expect(items.some((i) => i.includes("YOUTUBE"))).toBe(false);
  });
  it("returns [] when absent", () => {
    expect(extractOnScreenText("nothing")).toEqual([]);
  });
});
