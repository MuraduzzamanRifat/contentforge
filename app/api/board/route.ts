import { NextRequest, NextResponse } from "next/server";
import {
  getBoardConfig, loadBoard, commitBoard, serializeBoard, type BoardData,
} from "@/lib/github-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const NOT_CONFIGURED = {
  error: "GitHub persistence not configured",
  hint: "Set GITHUB_TOKEN + GITHUB_BOARD_REPO (owner/repo) in the env. See PERSISTENCE.md.",
};

/** Load the shared board. 200 {data,sha} | 204-ish {data:null} (fresh) | 412 not configured */
export async function GET() {
  const cfg = getBoardConfig();
  if (!cfg) return NextResponse.json(NOT_CONFIGURED, { status: 412 });
  try {
    const { data, sha } = await loadBoard(cfg);
    return NextResponse.json({ data, sha, repo: `${cfg.owner}/${cfg.repo}`, path: cfg.path });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Board load failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }
}

/** Commit the shared board. Body: { board:{rows,comments}, sha?, by? }. */
export async function PUT(req: NextRequest) {
  const cfg = getBoardConfig();
  if (!cfg) return NextResponse.json(NOT_CONFIGURED, { status: 412 });

  let body: { board?: BoardData; sha?: string | null; by?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.board || !Array.isArray(body.board.rows)) {
    return NextResponse.json({ error: "board.rows[] required" }, { status: 400 });
  }

  const json = serializeBoard({
    rows: body.board.rows,
    comments: body.board.comments ?? {},
  });
  const who = (body.by || "operator").slice(0, 40);
  const message = `board: ${body.board.rows.length} rows · update by ${who}`;

  try {
    const { sha } = await commitBoard(cfg, json, body.sha ?? null, message);
    return NextResponse.json({ sha, ok: true });
  } catch (err: unknown) {
    // Stale sha → someone committed between our load and write. Refetch the
    // latest sha and retry once (last-write-wins for this writer).
    if (err instanceof Error && err.name === "BoardConflictError") {
      try {
        const latest = await loadBoard(cfg);
        const { sha } = await commitBoard(cfg, json, latest.sha, `${message} (resolved conflict)`);
        return NextResponse.json({ sha, ok: true, conflictResolved: true });
      } catch (err2: unknown) {
        return NextResponse.json(
          { error: "Board commit failed after conflict retry", detail: err2 instanceof Error ? err2.message : String(err2) },
          { status: 409 }
        );
      }
    }
    return NextResponse.json(
      { error: "Board commit failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }
}
