"use client";

import { useState } from "react";
import {
  Sparkles, Loader2, ChevronDown, ChevronRight, CheckCircle2, AlertTriangle,
  Copy, X, ArrowRight, RotateCcw,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TRACK_STYLES, TRACK_LABELS } from "@/lib/types";
import type { TopicCandidate } from "@/lib/topic-intake";

const BATCH = 5;

export function GenerateBoard() {
  const candidates = useStore((s) => s.topicCandidates);
  const genStatus = useStore((s) => s.genStatus);
  const genError = useStore((s) => s.genError);
  const setCandidates = useStore((s) => s.setTopicCandidates);
  const setGenStatus = useStore((s) => s.setGenStatus);
  const approve = useStore((s) => s.approveCandidate);
  const reject = useStore((s) => s.rejectCandidate);
  const clear = useStore((s) => s.clearCandidates);
  const rows = useStore((s) => s.rows);
  const setSection = useStore((s) => s.setSection);

  const [open, setOpen] = useState<Set<string>>(new Set());
  const [approved, setApproved] = useState(0);

  const busy = genStatus === "generating";
  // In the pure empty state (no candidates, no error) the centered CTA already
  // explains + offers Generate — so don't double the header subtitle/button.
  const showHeader = candidates.length > 0 || genStatus === "error";

  async function generate() {
    setGenStatus("generating");
    try {
      const res = await fetch("/api/ai/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count: BATCH,
          avoid: rows.map((r) => ({ title: r.title, hook: r.hook, category: r.category })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Surface the REAL reason (route returns detail + hint), never just
        // an opaque "AI call failed".
        const reason = data.detail || data.error || `HTTP ${res.status}`;
        setGenStatus("error", data.hint ? `${reason}\n${data.hint}` : reason);
        return;
      }
      setCandidates(data.candidates as TopicCandidate[]);
      setOpen(new Set());
    } catch (e) {
      setGenStatus("error", e instanceof Error ? e.message : "Network error");
    }
  }

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div>
          <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
            <Sparkles className="h-4 w-4 text-primary" /> Generate topics
          </h2>
          {showHeader && (
            <p className="text-[11px] text-muted-foreground">
              AI proposes {BATCH} factual agarwood topics with full scripts — deduped vs the 260-plan
              &amp; approved, Daracheon-compliant. Approve to send into the Sheet as a Draft.
            </p>
          )}
        </div>
        {showHeader && (
          <div className="flex items-center gap-2">
            {candidates.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clear} disabled={busy}>
                <X className="h-3.5 w-3.5" /> Clear
              </Button>
            )}
            <Button size="sm" onClick={generate} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {candidates.length > 0 ? `Regenerate ${BATCH}` : `Generate ${BATCH} topics`}
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {approved > 0 && (
          <div className="mb-4 flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            <span>{approved} topic{approved > 1 ? "s" : ""} added to the Sheet as Draft.</span>
            <button
              type="button"
              className="font-medium underline underline-offset-2"
              onClick={() => setSection("sheet")}
            >
              Open Sheet →
            </button>
          </div>
        )}

        {genStatus === "error" && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">
              <div className="font-medium">Couldn’t generate topics</div>
              <div className="whitespace-pre-line opacity-90">{genError}</div>
            </div>
            <Button variant="outline" size="sm" onClick={generate}>
              <RotateCcw className="h-3.5 w-3.5" /> Retry
            </Button>
          </div>
        )}

        {/* Empty state */}
        {candidates.length === 0 && genStatus !== "error" && (
          <div className="flex h-full min-h-[50vh] flex-col items-center justify-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <h3 className="mt-4 text-base font-semibold">Start with {BATCH} topics</h3>
            <p className="mt-1 max-w-md text-[13px] text-muted-foreground">
              Each comes with a complete, sourced script. Nothing repeats the curated 260-video
              plan or anything you’ve already approved. Read the script, then approve the good ones
              into the Sheet.
            </p>
            <Button className="mt-5" onClick={generate} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate {BATCH} topics
            </Button>
          </div>
        )}

        {/* Candidate cards */}
        <div className="mx-auto flex max-w-4xl flex-col gap-3">
          {candidates.map((c) => (
            <Card
              key={c.id}
              c={c}
              open={open.has(c.id)}
              onToggle={() => toggle(c.id)}
              onApprove={() => { approve(c.id); setApproved((n) => n + 1); }}
              onReject={() => reject(c.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Card({
  c, open, onToggle, onApprove, onReject,
}: {
  c: TopicCandidate;
  open: boolean;
  onToggle: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const flagged = c.compliance.level === "flag";

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-start gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1", TRACK_STYLES[c.track])}>
              {c.track} · {TRACK_LABELS[c.track]}
            </span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {c.category}
            </span>
            {flagged ? (
              <span
                className="flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300"
                title={`Banned phrase(s): ${c.compliance.hits.join(", ")}`}
              >
                <AlertTriangle className="h-3 w-3" /> Review: {c.compliance.hits.join(", ")}
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                <CheckCircle2 className="h-3 w-3" /> Compliant
              </span>
            )}
            {c.duplicate && (
              <span
                className="flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                title={`Lexically similar to an existing topic (${Math.round(c.duplicate.score * 100)}%)`}
              >
                <AlertTriangle className="h-3 w-3" /> ≈ {c.duplicate.title} ({Math.round(c.duplicate.score * 100)}%)
              </span>
            )}
          </div>
          <h3 className="mt-2 text-[15px] font-semibold leading-snug">{c.title}</h3>
          <p className="mt-0.5 text-[13px] italic text-muted-foreground">{c.hook}</p>
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
          <Button size="sm" onClick={onApprove} title="Add to the Sheet as a Draft">
            Approve <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onReject} className="text-muted-foreground">
            <X className="h-3.5 w-3.5" /> Reject
          </Button>
        </div>
      </div>

      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-1.5 border-t border-border px-4 py-2 text-[12px] font-medium text-foreground/70 hover:bg-muted"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        {open ? "Hide script" : "Read script"}
      </button>

      {open && (
        <div className="border-t border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Script
            </span>
            <button
              type="button"
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={() => {
                navigator.clipboard?.writeText(c.script).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                });
              }}
            >
              <Copy className="h-3 w-3" /> {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="mt-1.5 whitespace-pre-wrap font-sans text-[12.5px] leading-relaxed text-foreground/90">
            {c.script}
          </pre>
          {c.sources.length > 0 && (
            <>
              <div className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Sources
              </div>
              <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-[12px] text-muted-foreground">
                {c.sources.map((s, i) => (
                  <li key={i} className="break-words">{s}</li>
                ))}
              </ol>
            </>
          )}
        </div>
      )}
    </div>
  );
}
