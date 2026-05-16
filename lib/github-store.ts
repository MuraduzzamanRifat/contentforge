/**
 * GitHub-as-DB persistence (server-only).
 *
 * The shared board ({ rows, comments }) lives as a single JSON file in a
 * GitHub repo. Reads/writes go through the GitHub Contents API with a PAT;
 * every write is a versioned commit (free, auditable — matches the
 * gold-kings / BrandiVibe pattern). Optimistic concurrency via the blob sha.
 *
 * Per-user UI prefs (dark, section, viewerLang/Role) are NOT synced — the
 * client's theme shouldn't follow the operator's. Only collaborative data.
 *
 * Config (env):
 *   GITHUB_TOKEN        fine-grained PAT, Contents read+write on the board repo
 *   GITHUB_BOARD_REPO   "owner/repo" (recommend a dedicated PRIVATE repo)
 *   GITHUB_BOARD_PATH   default "board.json"
 *   GITHUB_BOARD_BRANCH default "main"
 */

import type { Content, ReviewComment } from "./types";

export interface BoardData {
  rows: Content[];
  comments: Record<string, ReviewComment[]>;
}

export interface BoardConfig {
  token: string;
  owner: string;
  repo: string;
  path: string;
  branch: string;
}

/** Pure: read board config from env. null when not configured. */
export function getBoardConfig(
  env: Record<string, string | undefined> = process.env,
): BoardConfig | null {
  const token = env.GITHUB_TOKEN;
  const repoFull = env.GITHUB_BOARD_REPO;
  if (!token || !repoFull) return null;
  const [owner, repo] = repoFull.split("/");
  if (!owner || !repo) return null;
  return {
    token,
    owner,
    repo,
    path: env.GITHUB_BOARD_PATH || "board.json",
    branch: env.GITHUB_BOARD_BRANCH || "main",
  };
}

/** Pure: keep only the collaborative slice that belongs in the repo. */
export function serializeBoard(state: { rows: Content[]; comments: Record<string, ReviewComment[]> }): string {
  const data: BoardData = { rows: state.rows, comments: state.comments ?? {} };
  return JSON.stringify(data, null, 2);
}

/** Pure: parse + shape-guard a board JSON string. Throws on malformed. */
export function parseBoard(json: string): BoardData {
  const v = JSON.parse(json);
  if (!v || !Array.isArray(v.rows)) throw new Error("board.json: missing rows[]");
  return { rows: v.rows, comments: v.comments && typeof v.comments === "object" ? v.comments : {} };
}

const API = "https://api.github.com";

function headers(cfg: BoardConfig) {
  return {
    Authorization: `Bearer ${cfg.token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

const contentsUrl = (c: BoardConfig) =>
  `${API}/repos/${c.owner}/${c.repo}/contents/${encodeURIComponent(c.path)}`;

export interface LoadResult {
  data: BoardData | null; // null = file doesn't exist yet (fresh repo)
  sha: string | null;
}

/** Read the board file. 404 → not created yet (returns nulls). */
export async function loadBoard(cfg: BoardConfig): Promise<LoadResult> {
  const res = await fetch(`${contentsUrl(cfg)}?ref=${encodeURIComponent(cfg.branch)}`, {
    headers: headers(cfg),
    cache: "no-store",
  });
  if (res.status === 404) return { data: null, sha: null };
  if (!res.ok) throw new Error(`GitHub load failed: ${res.status} ${await res.text()}`);
  const j = (await res.json()) as { content: string; sha: string; encoding: string };
  const json = Buffer.from(j.content, "base64").toString("utf8");
  return { data: parseBoard(json), sha: j.sha };
}

/**
 * Commit the board. Requires the current sha when the file exists
 * (optimistic concurrency). On 409 (someone else committed first) the caller
 * should reload the sha and retry.
 */
export async function commitBoard(
  cfg: BoardConfig,
  json: string,
  sha: string | null,
  message: string,
): Promise<{ sha: string }> {
  const res = await fetch(contentsUrl(cfg), {
    method: "PUT",
    headers: { ...headers(cfg), "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content: Buffer.from(json, "utf8").toString("base64"),
      branch: cfg.branch,
      ...(sha ? { sha } : {}),
    }),
  });
  if (res.status === 409) {
    const e = new Error("GitHub commit conflict (stale sha)");
    e.name = "BoardConflictError";
    throw e;
  }
  if (!res.ok) throw new Error(`GitHub commit failed: ${res.status} ${await res.text()}`);
  const j = (await res.json()) as { content: { sha: string } };
  return { sha: j.content.sha };
}
