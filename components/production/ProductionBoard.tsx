"use client";

import { useMemo, useState } from "react";
import {
  Clapperboard, Film, ExternalLink, CheckCircle2, Circle, Upload, X,
  Mic, Captions, Music, Layers, Scissors, ListChecks, AlertTriangle, RotateCcw,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import { TRACK_STYLES, STATUS_STYLES, type Content, type ProductionChecklist } from "@/lib/types";
import { parseScenes } from "@/lib/scenes";
import { buildScenePrompt } from "@/lib/flow-prompt";

/** Rows whose script is locked for production (Workflow "Ready") or already in production. */
function inProduction(c: Content): boolean {
  return (c.status === "APPROVED" && c.productionLocked === true) || !!c.production;
}

const CHECK_META: { key: keyof ProductionChecklist; label: string; icon: typeof Mic }[] = [
  { key: "scenes",    label: "All scene clips generated", icon: Film },
  { key: "voiceover", label: "Voiceover recorded & synced", icon: Mic },
  { key: "subtitles", label: "Subtitles (EN + KO) burned/uploaded", icon: Captions },
  { key: "music",     label: "Background music mixed", icon: Music },
  { key: "broll",     label: "B-roll / transitions added", icon: Layers },
  { key: "finalCut",  label: "Final cut rendered", icon: Scissors },
];

export function ProductionBoard() {
  const rows = useStore((s) => s.rows);
  const selectedId = useStore((s) => s.selectedId);
  const select = useStore((s) => s.select);
  const initProduction = useStore((s) => s.initProduction);
  const setSceneStatus = useStore((s) => s.setSceneStatus);
  const setSceneClip = useStore((s) => s.setSceneClip);
  const toggleCheck = useStore((s) => s.toggleProductionCheck);
  const finalize = useStore((s) => s.finalizeProduction);

  const list = useMemo(() => rows.filter(inProduction), [rows]);
  const row = useMemo(() => rows.find((r) => r.id === selectedId && inProduction(r)) ?? null, [rows, selectedId]);

  const [flowCopied, setFlowCopied] = useState<string | null>(null);

  const prod = row?.production;
  const sceneCount = prod?.scenes.length ?? 0;
  const clipsReady = prod?.scenes.filter((s) => s.status === "clip-ready").length ?? 0;
  const allClips = sceneCount > 0 && clipsReady === sceneCount;
  const allChecks = prod ? Object.values(prod.checklist).every(Boolean) : false;
  const canFinalize = allClips && allChecks && !prod?.finalizedAt;
  // Preview: does this row even have a parseable script?
  const hasScript = !!row?.script && parseScenes(row.script).length > 0;

  return (
    <div className="flex h-full overflow-hidden">
      {/* List */}
      <div className="flex w-[300px] shrink-0 flex-col border-r border-border">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-[15px] font-semibold tracking-tight">Production</h2>
          <p className="text-[11px] text-muted-foreground">Google Flow — manual scene render</p>
        </div>
        <div className="flex-1 overflow-auto">
          {list.length === 0 && (
            <p className="p-6 text-center text-[12px] text-muted-foreground">
              Nothing in production. Lock an approved script for production in Workflow.
            </p>
          )}
          {list.map((r) => {
            const p = r.production;
            const ready = p ? p.scenes.filter((s) => s.status === "clip-ready").length : 0;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => select(r.id)}
                className={cn(
                  "flex w-full cursor-pointer flex-col gap-1 border-b border-border px-3 py-2.5 text-left transition hover:bg-muted/50",
                  selectedId === r.id && "bg-primary/[0.06]"
                )}
              >
                <div className="flex items-center gap-1.5">
                  {r.track && <span className={cn("chip", TRACK_STYLES[r.track])}>{r.track}</span>}
                  {r.production?.finalizedAt ? (
                    <span className="chip bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">Finalized</span>
                  ) : (
                    <span className={cn("chip", STATUS_STYLES[r.status])}>{r.status}</span>
                  )}
                  {p && (
                    <span className="num ml-auto text-[10px] text-muted-foreground">
                      {ready}/{p.scenes.length} clips
                    </span>
                  )}
                </div>
                <div className="line-clamp-2 text-[12.5px] font-medium leading-snug">{r.title || "Untitled"}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Workspace */}
      {!row ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          <Clapperboard className="h-6 w-6 opacity-40" />
          Select a locked script to produce.
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
            <span className={cn("chip", STATUS_STYLES[row.status])}>{row.status}</span>
            {row.track && <span className={cn("chip", TRACK_STYLES[row.track])}>{row.track}</span>}
            <span className="truncate text-[13px] font-semibold">{row.title || "Untitled"}</span>
            {!prod && hasScript && (
              <Button size="sm" className="ml-auto cursor-pointer" onClick={() => initProduction(row.id)}>
                <Film className="mr-1 h-3.5 w-3.5" /> Break script into scenes
              </Button>
            )}
          </div>

          <div className="flex-1 space-y-4 overflow-auto p-4">
            {!hasScript && (
              <p className="rounded-md border border-dashed border-border px-3 py-10 text-center text-[12px] text-muted-foreground">
                This video has no script yet. Generate + approve it in Workflow before producing.
              </p>
            )}

            {hasScript && !prod && (
              <p className="rounded-md border border-dashed border-border px-3 py-10 text-center text-[12px] text-muted-foreground">
                Click <strong>Break script into scenes</strong> — each time-coded beat becomes a Google Flow clip.
              </p>
            )}

            {prod && (
              <>
                {/* Animation direction reminder */}
                {prod.animationDirection && (
                  <section className="rounded-md border border-sky-200/70 bg-sky-50/50 p-3 text-[12px] dark:border-sky-900/60 dark:bg-sky-950/30">
                    <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                      <Film className="h-3 w-3" /> Animation direction (every clip)
                    </div>
                    <p className="text-sky-900/90 dark:text-sky-100/90">{prod.animationDirection}</p>
                  </section>
                )}

                {/* Scene timeline */}
                <section>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Scenes — paste each into Google Flow, render, upload the clip back
                    </span>
                    <span className="num text-[11px] text-muted-foreground">{clipsReady}/{sceneCount} ready</span>
                  </div>
                  <ul className="space-y-2">
                    {prod.scenes.map((sc, i) => {
                      const parsed = { id: sc.id, label: sc.label, start: sc.timecode.split("–")[0] ?? sc.timecode, end: sc.timecode.split("–")[1] ?? "", text: sc.text };
                      return (
                        <li key={sc.id} className="rounded-lg border border-border bg-card p-3">
                          <div className="mb-1.5 flex items-center gap-2">
                            <span className="num text-[10px] text-muted-foreground">#{i + 1}</span>
                            <span className="text-[12px] font-semibold">{sc.label}</span>
                            <span className="num text-[10px] text-muted-foreground">{sc.timecode}</span>
                            <span
                              className={cn(
                                "chip ml-auto",
                                sc.status === "clip-ready"
                                  ? "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                                  : sc.status === "prompt-copied"
                                  ? "bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
                                  : "bg-muted text-muted-foreground ring-border"
                              )}
                            >
                              {sc.status === "clip-ready" ? "clip ready" : sc.status === "prompt-copied" ? "prompt copied" : "pending"}
                            </span>
                          </div>
                          <p className="mb-2 line-clamp-3 text-[12px] leading-relaxed text-foreground/80">{sc.text}</p>

                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="cursor-pointer"
                              onClick={async () => {
                                try { await navigator.clipboard.writeText(buildScenePrompt(row, parsed)); } catch {}
                                setSceneStatus(row.id, sc.id, sc.status === "clip-ready" ? "clip-ready" : "prompt-copied");
                                setFlowCopied(sc.id);
                                setTimeout(() => setFlowCopied((v) => (v === sc.id ? null : v)), 2000);
                                window.open("https://flow.google.com", "_blank", "noopener,noreferrer");
                              }}
                              title="Copy this scene's prompt and open Google Flow"
                            >
                              <Film className="mr-1 h-3.5 w-3.5" />
                              {flowCopied === sc.id ? "Prompt copied" : "Copy prompt + open Flow"}
                              <ExternalLink className="ml-1 h-3 w-3 opacity-60" />
                            </Button>

                            {sc.clipUrl ? (
                              <span className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400">
                                <CheckCircle2 className="h-3.5 w-3.5" /> clip uploaded
                                <button
                                  type="button"
                                  onClick={() => setSceneClip(row.id, sc.id, undefined)}
                                  className="cursor-pointer text-muted-foreground/60 hover:text-destructive"
                                  aria-label="Remove clip"
                                  title="Remove clip"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ) : (
                              <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-[11px] font-medium transition hover:bg-muted">
                                <Upload className="h-3.5 w-3.5" /> Upload rendered clip
                                <input
                                  type="file"
                                  accept="video/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) setSceneClip(row.id, sc.id, URL.createObjectURL(f));
                                  }}
                                />
                              </label>
                            )}
                          </div>

                          {sc.clipUrl && (
                            <video
                              src={sc.clipUrl}
                              controls
                              className="mt-2 max-h-44 w-full rounded-md border border-border bg-black"
                            />
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>

                {/* Manual editing checklist */}
                <section className="rounded-lg border border-border bg-card p-3">
                  <div className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <ListChecks className="h-3.5 w-3.5" /> Editing checklist (tick as you complete in your editor)
                  </div>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {CHECK_META.map(({ key, label, icon: Icon }) => {
                      const done = prod.checklist[key];
                      const autoScenes = key === "scenes" && allClips;
                      const checked = done || autoScenes;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => toggleCheck(row.id, key)}
                          disabled={key === "scenes"}
                          className={cn(
                            "flex items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] transition",
                            key === "scenes" ? "cursor-default" : "cursor-pointer hover:bg-muted/60",
                            checked ? "text-emerald-700 dark:text-emerald-400" : "text-foreground/70"
                          )}
                          title={key === "scenes" ? "Auto — ticks when every scene clip is uploaded" : undefined}
                        >
                          {checked ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <Circle className="h-4 w-4 shrink-0 opacity-40" />}
                          <Icon className="h-3.5 w-3.5 shrink-0 opacity-60" />
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {prod.onScreenText.length > 0 && (
                  <section className="rounded-lg border border-amber-200/70 bg-amber-50/40 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
                    <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="h-3 w-3" /> On-screen text — must be factually verified before render
                    </div>
                    <ul className="space-y-0.5 text-[12px] text-amber-900/90 dark:text-amber-100/90">
                      {prod.onScreenText.map((t, i) => <li key={i}>· {t}</li>)}
                    </ul>
                  </section>
                )}
              </>
            )}
          </div>

          {prod && (
            <div className="space-y-2 border-t border-border bg-muted/30 p-3">
              {prod.finalizedAt ? (
                <p className="flex items-center gap-1.5 text-[12px] font-medium text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" /> Finalized {formatDate(prod.finalizedAt)} — now in Publish.
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {!canFinalize && (
                    <span className="text-[11px] text-muted-foreground">
                      {!allClips ? `Upload all ${sceneCount} scene clips` : "Tick every editing-checklist item"} to finalize.
                    </span>
                  )}
                  <Button
                    size="sm"
                    className="ml-auto cursor-pointer bg-emerald-600 hover:bg-emerald-700"
                    disabled={!canFinalize}
                    onClick={() => finalize(row.id)}
                    title="Marks the video approved and moves it to Publish"
                  >
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Finalize cut → Publish
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="cursor-pointer text-muted-foreground hover:text-foreground"
                    onClick={() => initProduction(row.id)}
                    title="Re-parse scenes from the current script (keeps existing clips)"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
