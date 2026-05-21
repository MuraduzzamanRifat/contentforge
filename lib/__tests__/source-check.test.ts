import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { extractUrl, checkOne, checkSources } from "../source-check";

describe("extractUrl", () => {
  it("returns the URL out of mixed strings", () => {
    expect(extractUrl("https://pmc.ncbi.nlm.nih.gov/articles/PMC6271187/")).toBe(
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC6271187/",
    );
    expect(
      extractUrl("https://example.com/foo — title of the paper."),
    ).toBe("https://example.com/foo");
  });
  it("strips trailing punctuation", () => {
    expect(extractUrl("see https://example.com/foo.")).toBe("https://example.com/foo");
    expect(extractUrl("(https://example.com/x)")).toBe("https://example.com/x");
  });
  it("returns null for non-URL sources (named citations)", () => {
    expect(extractUrl("JSTOR — historical agarwood grading")).toBeNull();
    expect(extractUrl("")).toBeNull();
    expect(extractUrl("ftp://example.com")).toBeNull();
  });
});

describe("checkOne (mocked fetch)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("marks no-URL inputs as ok:null without any fetch", async () => {
    const r = await checkOne("JSTOR — Wikipedia-only reference");
    expect(r.ok).toBeNull();
    expect(r.url).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("ok:true on a plain HEAD 200", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true, status: 200 });
    const r = await checkOne("https://example.com/paper");
    expect(r).toMatchObject({ ok: true, status: 200, url: "https://example.com/paper" });
  });

  it("falls back to range-GET on a 405 then succeeds (206)", async () => {
    const mock = fetch as unknown as ReturnType<typeof vi.fn>;
    mock.mockResolvedValueOnce({ ok: false, status: 405 });   // HEAD
    mock.mockResolvedValueOnce({ ok: false, status: 206 });   // range GET → partial-content
    const r = await checkOne("https://academic.example/article");
    expect(r.ok).toBe(true); // 206 counts as ok
    expect(r.status).toBe(206);
    expect(mock).toHaveBeenCalledTimes(2);
  });

  it("ok:false when the URL is genuinely dead", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false, status: 404 });
    const r = await checkOne("https://example.com/gone");
    expect(r).toMatchObject({ ok: false, status: 404 });
  });

  it("ok:false with reason on a fetch throw", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOTFOUND"));
    const r = await checkOne("https://does-not-exist.example/");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("ENOTFOUND");
  });
});

describe("checkSources ordering", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) =>
      Promise.resolve({ ok: !url.includes("dead"), status: url.includes("dead") ? 404 : 200 }),
    ));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("returns results aligned by input index", async () => {
    const out = await checkSources([
      "https://example.com/ok",
      "Named only",
      "https://example.com/dead",
    ]);
    expect(out[0].ok).toBe(true);
    expect(out[1].ok).toBeNull();
    expect(out[2].ok).toBe(false);
  });
});
