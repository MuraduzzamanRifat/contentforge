"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { STATUS_STYLES, TRACK_STYLES, TRACK_LABELS } from "@/lib/types";
import { cn, formatCost, formatDate } from "@/lib/utils";
import {
  Sparkles, ExternalLink, Image as ImageIcon, FileText, Palette,
  ShieldCheck, AlertTriangle, Film, Copy as CopyIcon, BookOpenCheck,
  Loader2, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditableCell } from "./EditableCell";
import { findDuplicates, severity } from "@/lib/dedupe";
import { buildFlowPrompt } from "@/lib/flow-prompt";
import { extractYouTubeId } from "@/lib/youtube-id";
import {
  ANIMATION, CTA, NEVER_SAY, ALWAYS_FRAME, SOURCE_MAP, BASELINE_TAGS,
} from "@/lib/project-config";

const SEV_STYLES: Record<"low" | "medium" | "high", string> = {
  low:    "text-amber-700 bg-amber-50 ring-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:ring-amber-900/60",
  medium: "text-orange-700 bg-orange-50 ring-orange-200 dark:text-orange-300 dark:bg-orange-950/40 dark:ring-orange-900/60",
  high:   "text-red-700 bg-red-50 ring-red-200 dark:text-red-300 dark:bg-red-950/40 dark:ring-red-900/60",
};

export function PreviewPanel() {
  const selectedId = useStore((s) => s.selectedId);
  const rows = useStore((s) => s.rows);
  const select = useStore((s) => s.select);
  const patch = useStore((s) => s.patch);

  const row = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);

  const dupes = useMemo(() => (row ? findDuplicates(rows, row, 5) : []), [rows, row]);
  const sources = row?.track ? SOURCE_MAP[row.track] : null;

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [flowCopied, setFlowCopied] = useState(false);
  const [ytIdDraft, setYtIdDraft] = useState("");

  if (!row) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
        <div className="rounded-full bg-muted p-3">
          <ImageIcon className="h-5 w-5 opacity-50" />
        </div>
        Select a row to preview.
        <p className="max-w-[18ch] text-xs text-muted-foreground/70">
          Brief, animation direction, sources, dupe check, and the Daracheon CTA all appear here.
        </p>
      </div>
    );
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    patch(row.id, { thumbnailUrl: url });
  };

  const copy = (text: string) => navigator.clipboard?.writeText(text).catch(() => {});
  const wordCount = (row.script || "").trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header chips */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <span className={cn("chip", STATUS_STYLES[row.status])}>{row.status}</span>
        {row.track && (
          <span className={cn("chip", TRACK_STYLES[row.track])}>
            {row.track} · {TRACK_LABELS[row.track]}
          </span>
        )}
        {row.weekIndex !== undefined && (
          <span className="num rounded bg-muted px-2 py-1 text-[10px] font-medium">
            Week {row.weekIndex} · {row.publishSlot}
          </span>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground">
          {formatDate(row.scheduledAt)} · {formatCost(row.aiCost)}
        </span>
      </div>

      <div className="flex-1 space-y-5 overflow-auto p-4">
        {/* Thumbnail */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="relative aspect-video w-full overflow-hidden rounded-lg border border-dashed border-border bg-muted/30 flex items-center justify-center text-xs text-muted-foreground"
        >
          {row.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={row.thumbnailUrl} alt={row.title} className="h-full w-full object-cover" />
          ) : (
            <span>Drop a thumbnail image here</span>
          )}
        </div>

        {/* Title */}
        <section>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Title</label>
          <EditableCell id={row.id} field="title" value={row.title} placeholder="Untitled…" className="text-base font-semibold" />
        </section>

        {/* Hook */}
        <section>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Hook</label>
          <EditableCell id={row.id} field="hook" value={row.hook} placeholder="Opening line that earns the next 30 seconds…" multiline />
        </section>

        {/* Possible duplicates — front and center */}
        {dupes.length > 0 && (
          <section className="rounded-md border border-amber-300/70 bg-amber-50/60 p-3 dark:border-amber-800/60 dark:bg-amber-950/30">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5" />
              Possible concept overlap — {dupes.length} video{dupes.length > 1 ? "s" : ""}
            </div>
            <p className="mb-2 text-[11px] leading-relaxed text-amber-900/80 dark:text-amber-100/80">
              Differentiate the angle, evidence, or visuals before writing. Click to jump.
            </p>
            <ul className="space-y-1.5">
              {dupes.map(({ row: d, score }) => {
                const sev = severity(score);
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => select(d.id)}
                      className="group flex w-full cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-left text-[12px] transition hover:bg-amber-100/60 dark:hover:bg-amber-900/30"
                    >
                      <span className={cn("num shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset", SEV_STYLES[sev])}>
                        {(score * 100).toFixed(0)}%
                      </span>
                      <span className="num shrink-0 text-[10px] text-muted-foreground">
                        W{String(d.weekIndex ?? 0).padStart(2, "0")}·{d.publishSlot}
                      </span>
                      {d.track && (
                        <span className={cn("chip shrink-0", TRACK_STYLES[d.track])}>{d.track}</span>
                      )}
                      <span className="truncate text-foreground/90 group-hover:underline">{d.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Production brief */}
        {row.brief && (
          <section className="rounded-md border border-border bg-muted/30 p-3">
            <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <FileText className="h-3 w-3" /> Production brief
            </div>
            <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-foreground/85">{row.brief}</pre>
          </section>
        )}

        {/* Animation direction — channel-wide rule */}
        <section className="rounded-md border border-sky-200/70 bg-sky-50/60 p-3 dark:border-sky-900/60 dark:bg-sky-950/30">
          <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-300">
            <Film className="h-3 w-3" /> Animation direction (channel rule)
          </div>
          <p className="text-[12px] font-medium text-sky-900 dark:text-sky-100">{ANIMATION.style}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-sky-900/80 dark:text-sky-100/80">{ANIMATION.rule}</p>
        </section>

        {/* Sources for fact-checking */}
        {sources && (
          <section>
            <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <BookOpenCheck className="h-3 w-3" /> Verify facts against · {sources.label}
            </div>
            <ul className="space-y-0.5 rounded-md border border-border bg-background px-3 py-2">
              {sources.sources.map((s) => (
                <li key={s} className="text-[11px] text-foreground/80">
                  <span className="num text-muted-foreground">•</span>{" "}{s}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Visual style (per-row) + Send to Flow */}
        {row.visualStyle && (
          <section>
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Palette className="h-3 w-3" /> Visual style prompt (this video)
              </div>
              <button
                type="button"
                onClick={async () => {
                  const prompt = buildFlowPrompt(row);
                  try { await navigator.clipboard.writeText(prompt); } catch {}
                  setFlowCopied(true);
                  setTimeout(() => setFlowCopied(false), 2000);
                  window.open("https://flow.google.com", "_blank", "noopener,noreferrer");
                }}
                className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-orange-300 bg-orange-50 px-2 py-1 text-[11px] font-medium text-orange-700 transition hover:bg-orange-100 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300"
                title="Copy formatted prompt and open Google Flow"
              >
                {flowCopied ? <CheckCircle2 className="h-3 w-3" /> : <Film className="h-3 w-3" />}
                {flowCopied ? "Prompt copied" : "Send to Google Flow"}
                <ExternalLink className="h-3 w-3 opacity-60" />
              </button>
            </div>
            <div className="rounded-md border border-border bg-background px-3 py-2 text-xs italic text-foreground/80">
              {row.visualStyle}
            </div>
          </section>
        )}

        {/* Script */}
        <section>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Script {wordCount > 0 && <span className="text-muted-foreground/60">· {wordCount} words</span>}
            </label>
          </div>
          <textarea
            value={row.script}
            onChange={(e) => patch(row.id, { script: e.target.value })}
            placeholder="Outline or full draft…"
            aria-label="Script"
            className="min-h-[10rem] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </section>

        {/* YouTube description */}
        <section>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              YouTube description
            </label>
            <button
              type="button"
              onClick={() => patch(row.id, { description: `${row.title}\n\n${row.hook}\n\n${CTA.descriptionBlock}` })}
              className="cursor-pointer text-[10px] text-primary hover:underline"
            >
              Insert Daracheon block
            </button>
          </div>
          <textarea
            value={row.description}
            onChange={(e) => patch(row.id, { description: e.target.value })}
            placeholder="What viewers will see in the YT description box…"
            aria-label="YouTube description"
            className="min-h-[6rem] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </section>

        {/* Daracheon CTA (Zoell Life) — pinned-comment ready */}
        <section className="rounded-md border border-orange-300/70 bg-orange-50/60 p-3 dark:border-orange-900/60 dark:bg-orange-950/25">
          <div className="mb-1 flex items-center justify-between">
            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-orange-700 dark:text-orange-300">
              <ShieldCheck className="h-3 w-3" /> Daracheon CTA · pinned comment
            </div>
            <button
              type="button"
              onClick={() => copy(CTA.pinnedComment)}
              className="cursor-pointer text-[10px] text-orange-700 hover:underline dark:text-orange-300"
            >
              <CopyIcon className="mr-0.5 inline h-3 w-3" /> Copy
            </button>
          </div>
          <pre className="whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-orange-900/90 dark:text-orange-100/90">
            {CTA.pinnedComment}
          </pre>

          <div className="mt-2 flex flex-wrap gap-1">
            {BASELINE_TAGS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  const tagLower = t.toLowerCase();
                  if (!row.tags.includes(tagLower))
                    patch(row.id, { tags: [...row.tags, tagLower] });
                }}
                className="cursor-pointer rounded-full bg-orange-100 px-2 py-0.5 text-[10px] text-orange-800 transition hover:bg-orange-200 dark:bg-orange-900/60 dark:text-orange-100"
                title="Click to add tag"
              >
                + {t}
              </button>
            ))}
          </div>
        </section>

        {/* Compliance guardrails — always say / never say */}
        <section className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-md border border-emerald-200/70 bg-emerald-50/40 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              Always frame as
            </div>
            <ul className="space-y-0.5 text-[11px] text-emerald-900/90 dark:text-emerald-100/90">
              {ALWAYS_FRAME.map((s) => <li key={s}>· {s}</li>)}
            </ul>
          </div>
          <div className="rounded-md border border-red-200/70 bg-red-50/40 p-3 dark:border-red-900/50 dark:bg-red-950/30">
            <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-red-700 dark:text-red-300">
              <AlertTriangle className="h-3 w-3" /> Never say
            </div>
            <ul className="space-y-0.5 text-[11px] text-red-900/90 dark:text-red-100/90">
              {NEVER_SAY.map((n) => <li key={n.phrase}>· {n.phrase}</li>)}
            </ul>
          </div>
        </section>

        {row.youtubeId && (
          <a
            href={`https://youtube.com/watch?v=${row.youtubeId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            View on YouTube <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {/* Sticky action bar */}
      <div className="space-y-2 border-t border-border bg-muted/30 px-4 py-3">
        {genError && (
          <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-[11px] text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            {genError}
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="cursor-pointer"
            disabled={generating}
            onClick={async () => {
              setGenError(null);
              setGenerating(true);
              patch(row.id, { status: "DRAFT" });
              try {
                const r = await fetch("/api/ai/script", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    title: row.title,
                    hook: row.hook,
                    brief: row.brief,
                    category: row.category,
                    track: row.track,
                    visualStyle: row.visualStyle,
                    weekIndex: row.weekIndex,
                    publishSlot: row.publishSlot,
                    // Server uses this to compute the avoid-overlap block for LLM-side dedupe.
                    allRows: rows.map((r) => ({
                      id: r.id,
                      title: r.title,
                      hook: r.hook,
                      brief: r.brief,
                      category: r.category,
                      track: r.track,
                      weekIndex: r.weekIndex,
                      publishSlot: r.publishSlot,
                    })),
                  }),
                });
                const data = await r.json();
                if (!r.ok) {
                  setGenError(data.hint ?? data.error ?? "Generation failed");
                  return;
                }
                patch(row.id, {
                  script: data.text,
                  aiCost: (row.aiCost || 0) + (data.usage ? estimateCost(data.usage) : 0.04),
                });
              } catch (err: unknown) {
                setGenError(err instanceof Error ? err.message : "Network error");
              } finally {
                setGenerating(false);
              }
            }}
            title="Generate using Claude (Pro/Max subscription if connected)"
          >
            {generating ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-1 h-3.5 w-3.5" />
            )}
            {generating ? "Generating…" : "Generate with Claude"}
          </Button>

          <div className="ml-auto flex items-center gap-1.5">
            <div className="flex flex-col items-end">
              <input
                type="text"
                value={ytIdDraft}
                onChange={(e) => setYtIdDraft(e.target.value)}
                placeholder="YouTube ID or URL"
                aria-label="YouTube ID or URL"
                aria-invalid={ytIdDraft.trim().length > 0 && !extractYouTubeId(ytIdDraft) ? "true" : "false"}
                className={cn(
                  "h-8 w-40 rounded-md border bg-background px-2 text-[12px] outline-none focus:border-ring",
                  ytIdDraft.trim().length > 0 && !extractYouTubeId(ytIdDraft)
                    ? "border-destructive/60 focus:border-destructive"
                    : "border-input"
                )}
              />
              {ytIdDraft.trim().length > 0 && !extractYouTubeId(ytIdDraft) && (
                <span className="mt-0.5 text-[10px] text-destructive">11-char ID or full YouTube URL</span>
              )}
            </div>
            <Button
              size="sm"
              className="cursor-pointer"
              disabled={!extractYouTubeId(ytIdDraft)}
              onClick={() => {
                const id = extractYouTubeId(ytIdDraft);
                if (!id) return;
                patch(row.id, {
                  status: "PUBLISHED",
                  publishedAt: new Date().toISOString(),
                  youtubeId: id,
                });
                setYtIdDraft("");
              }}
              title="Mark this row as published — you upload to YouTube manually"
            >
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Mark published
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function estimateCost(usage: { input_tokens?: number; output_tokens?: number } | undefined): number {
  if (!usage) return 0;
  // Opus 4.x ballpark: $15/M input, $75/M output. Rough.
  const i = (usage.input_tokens ?? 0) * 15 / 1_000_000;
  const o = (usage.output_tokens ?? 0) * 75 / 1_000_000;
  return i + o;
}
