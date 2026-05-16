import { describe, it, expect } from "vitest";
import { isValidYouTubeId, extractYouTubeId } from "../youtube-id";

describe("isValidYouTubeId", () => {
  it("accepts canonical 11-char IDs", () => {
    expect(isValidYouTubeId("dQw4w9WgXcQ")).toBe(true);
    expect(isValidYouTubeId("aaa-bbb_ccc")).toBe(true);
    expect(isValidYouTubeId("0123456789A")).toBe(true);
  });

  it("rejects wrong length", () => {
    expect(isValidYouTubeId("short")).toBe(false);
    expect(isValidYouTubeId("waytoolongidvalue")).toBe(false);
    expect(isValidYouTubeId("")).toBe(false);
  });

  it("rejects invalid characters", () => {
    expect(isValidYouTubeId("dQw4w9WgX!Q")).toBe(false);
    expect(isValidYouTubeId("dQw4w9 gXcQ")).toBe(false);
    expect(isValidYouTubeId("한글한글한글한글한")).toBe(false);
  });

  it("trims whitespace before validating", () => {
    expect(isValidYouTubeId(" dQw4w9WgXcQ")).toBe(true);
    expect(isValidYouTubeId("dQw4w9WgXcQ\n")).toBe(true);
    expect(isValidYouTubeId("   short   ")).toBe(false);
  });
});

describe("extractYouTubeId", () => {
  const VALID = "dQw4w9WgXcQ";

  it("returns a bare 11-char ID unchanged", () => {
    expect(extractYouTubeId(VALID)).toBe(VALID);
  });

  it("trims whitespace then accepts a bare ID", () => {
    expect(extractYouTubeId(`  ${VALID}  `)).toBe(VALID);
  });

  it("returns null for empty / whitespace input", () => {
    expect(extractYouTubeId("")).toBeNull();
    expect(extractYouTubeId("   ")).toBeNull();
  });

  it("extracts from youtube.com/watch?v=…", () => {
    expect(extractYouTubeId(`https://www.youtube.com/watch?v=${VALID}`)).toBe(VALID);
    expect(extractYouTubeId(`https://youtube.com/watch?v=${VALID}&t=120s`)).toBe(VALID);
    expect(extractYouTubeId(`http://m.youtube.com/watch?v=${VALID}`)).toBe(VALID);
  });

  it("extracts from youtu.be/…", () => {
    expect(extractYouTubeId(`https://youtu.be/${VALID}`)).toBe(VALID);
    expect(extractYouTubeId(`https://youtu.be/${VALID}?si=abc123`)).toBe(VALID);
  });

  it("extracts from /shorts/…, /embed/…, /live/…", () => {
    expect(extractYouTubeId(`https://www.youtube.com/shorts/${VALID}`)).toBe(VALID);
    expect(extractYouTubeId(`https://www.youtube.com/embed/${VALID}`)).toBe(VALID);
    expect(extractYouTubeId(`https://www.youtube.com/live/${VALID}`)).toBe(VALID);
  });

  it("returns null for foreign / malformed URLs", () => {
    expect(extractYouTubeId("https://vimeo.com/123456")).toBeNull();
    expect(extractYouTubeId("https://www.youtube.com/playlist?list=PLxx")).toBeNull();
    expect(extractYouTubeId("not a url at all")).toBeNull();
    expect(extractYouTubeId("https://www.youtube.com/")).toBeNull();
  });

  it("returns null when extracted ID itself is invalid", () => {
    expect(extractYouTubeId("https://youtu.be/short")).toBeNull();
    expect(extractYouTubeId("https://youtube.com/watch?v=tooLongAnId!!!!")).toBeNull();
  });
});
