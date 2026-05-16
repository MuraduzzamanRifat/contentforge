"use client";

import { useMemo, useState } from "react";
import {
  MessagesSquare, CheckCircle2, RotateCcw, Sparkles, Loader2, Languages,
  ChevronLeft, FileText, ShieldCheck, Trash2,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import { STATUS_STYLES, TRACK_STYLES, type ContentStatus, type Lang } from "@/lib/types";
import { CommentComposer } from "./CommentComposer";
import { CommentThread } from "./CommentThread";
import { YouTubeEmbed } from "./YouTubeEmbed";

// Statuses that belong on the review board, in workflow order.
const BOARD_STATUSES: ContentStatus[] = ["REVIEW", "DRAFT", "APPROVED", "SCHEDULED", "PUBLISHED"];

export function ReviewBoard() {
  const rows = useStore((s) => s.rows);
  const comments = useStore((s) => s.comments);
  const selectedId = useStore((s) => s.selectedId);
  const select = useStore((s) => s.select);
  const patch = useStore((s) => s.patch);
  const removeComment = useStore((s) => s.removeComment);
  const viewerLang = useStore((s) => s.viewerLang);
  const setViewerLang = useStore((s) => s.setViewerLang);

  const [statusTab, setStatusTab] = useState<ContentStatus>("REVIEW");
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryErr, setSummaryErr] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Partial<Record<ContentStatus, number>> = {};
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const list = useMemo(
    () => rows.filter((r) => r.status === statusTab),
    [rows, statusTab]
  );

  const row = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);
  const thread = row ? comments[row.id] ?? [] : [];

  const runSummary = async () => {
    if (!row?.script) return;
    setSummaryErr(null);
    setSummarizing(true);
    setSummary(null);
    try {
      const r = await fetch("/api/ai/review-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: row.script, title: row.title }),
      });
      const data = await r.json();
      if (!r.ok) setSummaryErr(data.hint ?? data.error ?? "Summary failed");
      else setSummary(data.summary);
    } catch (e) {
      setSummaryErr(e instanceof Error ? e.message : "Network error");
    } finally {
      setSummarizing(false);
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: status tabs + script list */}
      <div className="flex w-[300px] shrink-0 flex-col border-r border-border">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-[15px] font-semibold tracking-tight">Script Review</h2>
          <p className="text-[11px] text-muted-foreground">Approve scripts before production</p>
        </div>
        <div className="flex flex-wrap gap-1 border-b border-border p-2">
          {BOARD_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusTab(s)}
              className={cn(
                "chip cursor-pointer transition",
                statusTab === s ? cn(STATUS_STYLES[s], "ring-2 ring-offset-1 ring-offset-background") : cn(STATUS_STYLES[s], "opacity-55 hover:opacity-100")
              )}
            >
              {s} <span className="num font-normal opacity-70">{counts[s] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-auto">
          {list.length === 0 && (
            <p className="p-6 text-center text-[12px] text-muted-foreground">
              No scripts in {statusTab}.
            </p>
          )}
          {list.map((r) => {
            const n = (comments[r.id] ?? []).length;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => { select(r.id); setSummary(null); setSummaryErr(null); }}
                className={cn(
                  "flex w-full cursor-pointer flex-col gap-1 border-b border-border px-3 py-2.5 text-left transition hover:bg-muted/50",
                  selectedId === r.id && "bg-primary/[0.06]"
                )}
              >
                <div className="flex items-center gap-1.5">
                  {r.track && <span className={cn("chip", TRACK_STYLES[r.track])}>{r.track}</span>}
                  <span className="num text-[10px] text-muted-foreground">
                    W{String(r.weekIndex ?? 0).padStart(2, "0")}·{r.publishSlot}
                  </span>
                  {n > 0 && (
                    <span className="ml-auto flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <MessagesSquare className="h-3 w-3" /> {n}
                    </span>
                  )}
                </div>
                <div className="line-clamp-2 text-[12.5px] font-medium leading-snug">
                  {r.title || "Untitled"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: thread */}
      {!row ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          <MessagesSquare className="h-6 w-6 opacity-40" />
          Select a script to review.
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
            <button
              type="button"
              onClick={() => select(null)}
              className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
              aria-label="Back to list"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className={cn("chip", STATUS_STYLES[row.status])}>{row.status}</span>
            <span className="truncate text-[13px] font-semibold">{row.title || "Untitled"}</span>
            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center gap-1 text-[10.5px] text-muted-foreground">
                <Languages className="h-3 w-3" /> Read in
              </div>
              <div className="flex overflow-hidden rounded-md border border-border">
                {(["en", "ko"] as Lang[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setViewerLang(l)}
                    className={cn(
                      "cursor-pointer px-2 py-1 text-[11px] font-medium transition",
                      viewerLang === l ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {l === "en" ? "EN" : "한국어"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-auto p-4">
            {/* Published embed */}
            {row.status === "PUBLISHED" && row.youtubeId && <YouTubeEmbed youtubeId={row.youtubeId} />}

            {/* Script + summary */}
            <section className="rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <FileText className="h-3 w-3" /> Script
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="cursor-pointer"
                  disabled={!row.script || summarizing}
                  onClick={runSummary}
                  title="Korean TL;DR + compliance check for the client"
                >
                  {summarizing ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1 h-3.5 w-3.5" />}
                  {summarizing ? "Summarizing…" : "Korean summary for client"}
                </Button>
              </div>
              {!row.script ? (
                <p className="px-3 py-6 text-center text-[12px] text-muted-foreground">
                  No script yet. Generate it in the Sheet first (Generate with Claude).
                </p>
              ) : (
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap px-3 py-2 font-sans text-[12px] leading-relaxed text-foreground/85">
                  {row.script}
                </pre>
              )}
              {summaryErr && (
                <div className="border-t border-border px-3 py-2 text-[11px] text-amber-600 dark:text-amber-400">
                  {summaryErr}
                </div>
              )}
              {summary && (
                <div className="border-t border-border bg-amber-50/40 px-3 py-2 dark:bg-amber-950/20">
                  <div className="mb-1 flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    <ShieldCheck className="h-3 w-3" /> 클라이언트용 요약 (Korean)
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-[12px] leading-relaxed text-foreground/90">
                    {summary}
                  </pre>
                </div>
              )}
            </section>

            {/* Discussion thread */}
            <section>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Discussion ({thread.length})
              </div>
              <CommentThread contentId={row.id} />
            </section>

            {/* Decision bar */}
            <section className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Decision
              </span>
              <Button
                size="sm"
                className="cursor-pointer bg-emerald-600 hover:bg-emerald-700"
                disabled={row.status === "APPROVED"}
                onClick={() => patch(row.id, { status: "APPROVED" })}
              >
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Approve → production
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="cursor-pointer"
                disabled={row.status === "DRAFT"}
                onClick={() => patch(row.id, { status: "DRAFT" })}
              >
                <RotateCcw className="mr-1 h-3.5 w-3.5" /> Send back to draft
              </Button>
              <span className="ml-auto text-[11px] text-muted-foreground">
                Status gates production — only APPROVED scripts proceed.
              </span>
            </section>
          </div>

          <CommentComposer contentId={row.id} />
        </div>
      )}
    </div>
  );
}
