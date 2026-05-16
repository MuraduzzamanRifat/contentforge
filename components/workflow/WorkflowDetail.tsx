"use client";

import { useState } from "react";
import {
  X, FileText, Sparkles, Loader2, ShieldCheck, CheckCircle2, XCircle,
  RotateCcw, Lock, Languages, Film,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TRACK_STYLES, type Content, type Lang } from "@/lib/types";
import { workflowColumn, COLUMN_LABEL, COLUMN_STYLE } from "@/lib/workflow";
import { buildFlowPrompt } from "@/lib/flow-prompt";
import { CommentComposer } from "@/components/review/CommentComposer";
import { CommentThread } from "@/components/review/CommentThread";

export function WorkflowDetail({ row, onClose }: { row: Content; onClose: () => void }) {
  const approveScript = useStore((s) => s.approveScript);
  const rejectScript = useStore((s) => s.rejectScript);
  const reopenScript = useStore((s) => s.reopenScript);
  const lockForProduction = useStore((s) => s.lockForProduction);
  const sendToReview = useStore((s) => s.sendToReview);
  const viewerLang = useStore((s) => s.viewerLang);
  const setViewerLang = useStore((s) => s.setViewerLang);
  const threadLen = useStore((s) => (s.comments[row.id] ?? []).length);

  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryErr, setSummaryErr] = useState<string | null>(null);
  const [scriptOpen, setScriptOpen] = useState(false);
  const [flowCopied, setFlowCopied] = useState(false);

  const col = workflowColumn(row);

  const runSummary = async () => {
    if (!row.script) return;
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
    <div className="flex h-full w-full max-w-[440px] flex-col border-l border-border bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        {col && <span className={cn("chip", COLUMN_STYLE[col])}>{COLUMN_LABEL[col]}</span>}
        {row.track && <span className={cn("chip", TRACK_STYLES[row.track])}>{row.track}</span>}
        <span className="num text-[10px] text-muted-foreground">
          W{String(row.weekIndex ?? 0).padStart(2, "0")}·{row.publishSlot}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto cursor-pointer rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close detail"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-auto p-4">
        <h3 className="text-[14px] font-semibold leading-snug">{row.title || "Untitled"}</h3>

        {/* Korean summary — what the client reads first */}
        <section className="rounded-lg border border-amber-200/70 bg-amber-50/40 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              <ShieldCheck className="h-3 w-3" /> 클라이언트용 요약 (Korean)
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 cursor-pointer text-[11px]"
              disabled={!row.script || summarizing}
              onClick={runSummary}
            >
              {summarizing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
              {summarizing ? "요약 중…" : "Generate"}
            </Button>
          </div>
          {!row.script && <p className="text-[11px] text-muted-foreground">Generate the script first (Sheet → Generate with Claude).</p>}
          {summaryErr && <p className="text-[11px] text-amber-700 dark:text-amber-300">{summaryErr}</p>}
          {summary ? (
            <pre className="whitespace-pre-wrap font-sans text-[12px] leading-relaxed text-foreground/90">{summary}</pre>
          ) : row.script ? (
            <p className="text-[11px] text-muted-foreground">Click Generate for the Korean TL;DR + compliance check.</p>
          ) : null}
        </section>

        {/* Script (collapsible — operator detail, secondary for client) */}
        {row.script && (
          <section className="rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setScriptOpen((o) => !o)}
              className="flex w-full cursor-pointer items-center gap-1 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/40"
            >
              <FileText className="h-3 w-3" /> Script (EN) {scriptOpen ? "▾" : "▸"}
            </button>
            {scriptOpen && (
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap border-t border-border px-3 py-2 font-sans text-[12px] leading-relaxed text-foreground/85">
                {row.script}
              </pre>
            )}
          </section>
        )}

        {/* Discussion */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Discussion ({threadLen})
            </span>
            <div className="flex items-center gap-1">
              <Languages className="h-3 w-3 text-muted-foreground" />
              <div className="flex overflow-hidden rounded-md border border-border">
                {(["en", "ko"] as Lang[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setViewerLang(l)}
                    className={cn(
                      "cursor-pointer px-2 py-0.5 text-[10px] font-medium transition",
                      viewerLang === l ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {l === "en" ? "EN" : "한국어"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <CommentThread contentId={row.id} />
        </section>
      </div>

      {/* Decision bar — context-aware per column */}
      <div className="space-y-2 border-t border-border bg-muted/30 p-3">
        <div className="flex flex-wrap gap-2">
          {col === "DRAFT" && (
            <Button size="sm" className="cursor-pointer" onClick={() => sendToReview(row.id)}>
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Send to client review
            </Button>
          )}
          {col === "IN_REVIEW" && (
            <>
              <Button size="sm" className="cursor-pointer bg-emerald-600 hover:bg-emerald-700" onClick={() => approveScript(row.id)}>
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Approve
              </Button>
              <Button size="sm" variant="outline" className="cursor-pointer text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => rejectScript(row.id)}>
                <XCircle className="mr-1 h-3.5 w-3.5" /> Request changes
              </Button>
            </>
          )}
          {col === "REJECTED" && (
            <Button size="sm" className="cursor-pointer" onClick={() => reopenScript(row.id)}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reopen as draft
            </Button>
          )}
          {col === "APPROVED" && (
            <Button size="sm" className="cursor-pointer bg-violet-600 hover:bg-violet-700" onClick={() => lockForProduction(row.id)}>
              <Lock className="mr-1 h-3.5 w-3.5" /> Lock &amp; mark Ready for Production
            </Button>
          )}
          {col === "READY" && (
            <>
              <span className="flex items-center gap-1 text-[12px] font-medium text-violet-700 dark:text-violet-300">
                <Lock className="h-3.5 w-3.5" /> Locked — ready to produce
              </span>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto cursor-pointer"
                onClick={async () => {
                  try { await navigator.clipboard.writeText(buildFlowPrompt(row)); } catch {}
                  setFlowCopied(true);
                  setTimeout(() => setFlowCopied(false), 2000);
                  window.open("https://flow.google.com", "_blank", "noopener,noreferrer");
                }}
                title="Stage 2 (manual): copy scene-1 prompt + open Google Flow"
              >
                <Film className="mr-1 h-3.5 w-3.5" />
                {flowCopied ? "Prompt copied" : "Produce in Google Flow"}
              </Button>
            </>
          )}
        </div>
        {col !== "DRAFT" && col !== "REJECTED" && (
          <CommentComposer contentId={row.id} />
        )}
      </div>
    </div>
  );
}
