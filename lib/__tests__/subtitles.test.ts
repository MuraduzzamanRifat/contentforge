import { describe, it, expect } from "vitest";
import {
  tcToSeconds, srtTime, vttTime, resolveCues, scenesToSrt, scenesToVtt, type Cue,
} from "../subtitles";

describe("timecodes", () => {
  it("parses m:ss / mm:ss / h:mm:ss", () => {
    expect(tcToSeconds("0:08")).toBe(8);
    expect(tcToSeconds("1:23")).toBe(83);
    expect(tcToSeconds("1:02:03")).toBe(3723);
    expect(tcToSeconds("garbage")).toBe(0);
  });
  it("formats SRT (comma) and VTT (dot)", () => {
    expect(srtTime(83)).toBe("00:01:23,000");
    expect(vttTime(3723)).toBe("01:02:03.000");
  });
});

describe("resolveCues", () => {
  it("fills a missing end from the next cue start", () => {
    const cues: Cue[] = [
      { start: "0:00", end: "", text: "a" },
      { start: "0:08", end: "", text: "b" },
    ];
    const r = resolveCues(cues);
    expect(r[0]).toMatchObject({ start: 0, end: 8 });
    expect(r[1].start).toBe(8);
    expect(r[1].end).toBe(8 + 30); // last cue → +30
  });
  it("guards end <= start", () => {
    const r = resolveCues([{ start: "0:10", end: "0:10", text: "x" }]);
    expect(r[0].end).toBeGreaterThan(r[0].start);
  });
  it("collapses newlines in cue text", () => {
    expect(resolveCues([{ start: "0:00", end: "0:05", text: "a\n  b" }])[0].text).toBe("a b");
  });
});

describe("subtitle files", () => {
  const cues: Cue[] = [
    { start: "0:00", end: "0:08", text: "Hook line." },
    { start: "0:08", end: "0:25", text: "Cold open." },
  ];
  it("SRT is well-formed", () => {
    const srt = scenesToSrt(cues);
    expect(srt).toContain("1\n00:00:00,000 --> 00:00:08,000\nHook line.");
    expect(srt).toContain("2\n00:00:08,000 --> 00:00:25,000\nCold open.");
  });
  it("VTT starts with the WEBVTT header and dot timestamps", () => {
    const vtt = scenesToVtt(cues);
    expect(vtt.startsWith("WEBVTT")).toBe(true);
    expect(vtt).toContain("00:00:00.000 --> 00:00:08.000");
  });
});
