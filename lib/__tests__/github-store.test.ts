import { describe, it, expect } from "vitest";
import { getBoardConfig, serializeBoard, parseBoard } from "../github-store";
import type { Content } from "../types";

const row = (id: string): Content =>
  ({
    id, rowIndex: 0, status: "IDEA", title: id, hook: "", script: "",
    description: "", tags: [], aiCost: 0, createdAt: "", updatedAt: "",
  } as Content);

describe("getBoardConfig", () => {
  it("returns null when token or repo missing", () => {
    expect(getBoardConfig({})).toBeNull();
    expect(getBoardConfig({ GITHUB_TOKEN: "t" })).toBeNull();
    expect(getBoardConfig({ GITHUB_BOARD_REPO: "o/r" })).toBeNull();
    expect(getBoardConfig({ GITHUB_TOKEN: "t", GITHUB_BOARD_REPO: "no-slash" })).toBeNull();
  });

  it("parses owner/repo and applies path/branch defaults", () => {
    const c = getBoardConfig({ GITHUB_TOKEN: "t", GITHUB_BOARD_REPO: "Muraduzzaman/contentforge-data" })!;
    expect(c).toMatchObject({
      token: "t",
      owner: "Muraduzzaman",
      repo: "contentforge-data",
      path: "board.json",
      branch: "main",
    });
  });

  it("honors explicit path/branch overrides", () => {
    const c = getBoardConfig({
      GITHUB_TOKEN: "t",
      GITHUB_BOARD_REPO: "o/r",
      GITHUB_BOARD_PATH: "data/board.json",
      GITHUB_BOARD_BRANCH: "data",
    })!;
    expect(c.path).toBe("data/board.json");
    expect(c.branch).toBe("data");
  });
});

describe("serializeBoard / parseBoard round-trip", () => {
  it("keeps only rows + comments (drops per-user UI prefs)", () => {
    const json = serializeBoard({
      rows: [row("a"), row("b")],
      comments: { a: [] },
      // extra UI fields that must NOT be persisted to the shared repo:
      ...( { dark: true, section: "sheet", viewerLang: "ko" } as unknown as object ),
    } as never);
    const parsed = JSON.parse(json);
    expect(Object.keys(parsed).sort()).toEqual(["comments", "rows"]);
    expect(parsed.dark).toBeUndefined();
  });

  it("round-trips rows + comments", () => {
    const board = { rows: [row("x")], comments: { x: [{ id: "c1" }] as never } };
    const back = parseBoard(serializeBoard(board));
    expect(back.rows.map((r) => r.id)).toEqual(["x"]);
    expect(back.comments.x).toHaveLength(1);
  });

  it("defaults comments to {} when absent", () => {
    expect(parseBoard(JSON.stringify({ rows: [] })).comments).toEqual({});
  });

  it("throws on malformed board (no rows array)", () => {
    expect(() => parseBoard(JSON.stringify({ comments: {} }))).toThrow(/rows/);
    expect(() => parseBoard("not json")).toThrow();
  });
});
