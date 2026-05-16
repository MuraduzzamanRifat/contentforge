import { describe, it, expect } from "vitest";
import { detectLang, otherLang } from "../lang";

describe("detectLang", () => {
  it("detects Korean from Hangul syllables", () => {
    expect(detectLang("동영상 제작전에 대본을 체크받고")).toBe("ko");
    expect(detectLang("좋습니다")).toBe("ko");
  });

  it("detects English for Latin text", () => {
    expect(detectLang("How about checking the script first?")).toBe("en");
    expect(detectLang("Approve this one")).toBe("en");
  });

  it("treats empty / whitespace as English (safe default)", () => {
    expect(detectLang("")).toBe("en");
    expect(detectLang("   ")).toBe("en");
  });

  it("mixed KO+EN follows the Hangul signal (client writes mixed)", () => {
    expect(detectLang("이 script 는 reject 합니다")).toBe("ko");
    expect(detectLang("CITES 인증 부분은 그대로 두세요")).toBe("ko");
  });

  it("numbers, punctuation, and glossary terms alone are English", () => {
    expect(detectLang("CITES + HACCP + GMP 2026")).toBe("en");
    expect(detectLang("0:08–0:25")).toBe("en");
  });
});

describe("otherLang", () => {
  it("flips the language", () => {
    expect(otherLang("ko")).toBe("en");
    expect(otherLang("en")).toBe("ko");
  });
});
