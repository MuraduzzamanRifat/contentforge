"use client";

import { useMemo, useState } from "react";
import { MessagesSquare, Sparkles, User, Users, CircleSlash, ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { TRACK_STYLES, type Track } from "@/lib/types";
import {
  WORKFLOW_COLUMNS, COLUMN_LABEL, COLUMN_STYLE,
  bucketByColumn, waitingOn, workflowColumn, type WaitingOn,
} from "@/lib/workflow";
import { WorkflowDetail } from "./WorkflowDetail";

const TRACKS: (Track | "ALL")[] = ["ALL", "A", "B", "C", "D"];
const WAIT_FILTERS: { id: WaitingOn | "all"; label: string; icon: typeof User }[] = [
  { id: "all", label: "Everything", icon: Users },
  { id: "me", label: "Me", icon: User },
  { id: "client", label: "Client", icon: Users },
  { id: "nobody", label: "Unblocked", icon: CircleSlash },
];

export function WorkflowBoard() {
  const rows = useStore((s) => s.rows);
  const comments = useStore((s) => s.comments);
  const selectedId = useStore((s) => s.selectedId);
  const select = useStore((s) => s.select);

  const [trackFilter, setTrackFilter] = useState<Track | "ALL">("ALL");
  const [waitFilter, setWaitFilter] = useState<WaitingOn | "all">("all");

  const filtered = useMemo(() => {
    let r = rows;
    if (trackFilter !== "ALL") r = r.filter((x) => x.track === trackFilter);
    if (waitFilter !== "all") r = r.filter((x) => waitingOn(x, comments[x.id] ?? []) === waitFilter);
    return r;
  }, [rows, trackFilter, waitFilter, comments]);

  const buckets = useMemo(() => bucketByColumn(filtered), [filtered]);

  // "Waiting on" counts for the filter chips (computed on all Stage-1 rows, not filtered).
  const waitCounts = useMemo(() => {
    const c: Record<WaitingOn, number> = { me: 0, client: 0, nobody: 0 };
    for (const r of rows) {
      if (workflowColumn(r) === null) continue; // not in Stage-1 pipeline
      c[waitingOn(r, comments[r.id] ?? [])]++;
    }
    return c;
  }, [rows, comments]);

  const row = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="border-b border-border px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-[15px] font-semibold tracking-tight">Workflow</h2>
            {/* Pipeline breadcrumb (informational) */}
            <div className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px]">
              <span className="font-semibold text-primary">① Script</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
              <span className="text-muted-foreground">② Production</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
              <span className="text-muted-foreground">③ Publish</span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Approve a script → it locks for production. Reject → back to Draft.
            </span>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-3">
            {/* Waiting-on filter — persona A's #1 opportunity */}
            <div className="flex items-center gap-1">
              <span className="mr-1 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                Waiting on
              </span>
              {WAIT_FILTERS.map(({ id, label, icon: Icon }) => {
                const count = id === "all" ? undefined : waitCounts[id as WaitingOn];
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setWaitFilter(id)}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset transition",
                      waitFilter === id
                        ? "bg-primary text-primary-foreground ring-primary"
                        : "bg-background text-muted-foreground ring-border hover:text-foreground"
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {label}
                    {count !== undefined && <span className="num opacity-70">{count}</span>}
                  </button>
                );
              })}
            </div>
            <span className="h-4 w-px bg-border" />
            <div className="flex items-center gap-1">
              {TRACKS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTrackFilter(t)}
                  className={cn(
                    "cursor-pointer rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1 ring-inset transition",
                    t === "ALL"
                      ? trackFilter === "ALL" ? "bg-foreground text-background ring-foreground" : "bg-muted text-muted-foreground ring-border hover:text-foreground"
                      : trackFilter === t ? cn(TRACK_STYLES[t as Track], "ring-2 ring-offset-1 ring-offset-background") : cn(TRACK_STYLES[t as Track], "opacity-60 hover:opacity-100")
                  )}
                >
                  {t === "ALL" ? "All tracks" : t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Kanban */}
        <div className="flex flex-1 gap-3 overflow-x-auto p-4">
          {WORKFLOW_COLUMNS.map((colId) => {
            const items = buckets[colId];
            return (
              <div key={colId} className="flex w-[260px] shrink-0 flex-col">
                <div className="mb-2 flex items-center gap-2">
                  <span className={cn("chip", COLUMN_STYLE[colId])}>{COLUMN_LABEL[colId]}</span>
                  <span className="num text-[11px] text-muted-foreground">{items.length}</span>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto rounded-lg bg-muted/30 p-2">
                  {items.length === 0 && (
                    <p className="px-2 py-6 text-center text-[11px] text-muted-foreground/60">
                      Empty
                    </p>
                  )}
                  {items.map((c) => {
                    const w = waitingOn(c, comments[c.id] ?? []);
                    const n = (comments[c.id] ?? []).length;
                    const active = selectedId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => select(c.id)}
                        className={cn(
                          "flex w-full cursor-pointer flex-col gap-1.5 rounded-md border bg-card px-2.5 py-2 text-left transition hover:border-foreground/20 hover:shadow-sm",
                          active ? "border-primary/50 ring-1 ring-primary/30" : "border-border"
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          {c.track && (
                            <span className={cn("inline-flex h-4 items-center rounded px-1 text-[9px] font-bold ring-1 ring-inset", TRACK_STYLES[c.track])}>
                              {c.track}
                            </span>
                          )}
                          <span className="num text-[10px] text-muted-foreground">
                            W{String(c.weekIndex ?? 0).padStart(2, "0")}·{c.publishSlot}
                          </span>
                          {n > 0 && (
                            <span className="ml-auto flex items-center gap-0.5 text-[10px] text-muted-foreground">
                              <MessagesSquare className="h-3 w-3" />{n}
                            </span>
                          )}
                        </div>
                        <div className="line-clamp-2 text-[12px] font-medium leading-snug">
                          {c.title || "Untitled"}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {!c.script && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-orange-100 px-1.5 py-0.5 text-[9px] font-semibold text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
                              <Sparkles className="h-2.5 w-2.5" /> no script
                            </span>
                          )}
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[9px] font-medium",
                              w === "me" ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                              : w === "client" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                              : "bg-muted text-muted-foreground"
                            )}
                          >
                            {w === "me" ? "on me" : w === "client" ? "on client" : "unblocked"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {row && <WorkflowDetail row={row} onClose={() => select(null)} />}
    </div>
  );
}
