"use client";

import { Plus, Trash2, CheckCircle2, RotateCcw, Filter, SendHorizonal } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { STATUSES, STATUS_STYLES, TRACK_STYLES, TRACK_LABELS, type Track } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown";

const TRACKS: Track[] = ["A", "B", "C", "D"];

export function Toolbar() {
  const {
    rows, selectedIds, filter, trackFilter,
    setFilter, setTrackFilter,
    addRow, bulkPatch, bulkRemove, clearSelection, reset,
  } = useStore();

  const ids = Array.from(selectedIds);
  const count = ids.length;

  const trackCounts = TRACKS.reduce<Record<Track, number>>(
    (acc, t) => ((acc[t] = rows.filter((r) => r.track === t).length), acc),
    { A: 0, B: 0, C: 0, D: 0 }
  );

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-background/60 px-4 py-2.5">
      {/* Track filter chips */}
      <div className="flex items-center gap-1.5">
        <span className="mr-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          Track
        </span>
        {TRACKS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTrackFilter(trackFilter === t ? "ALL" : t)}
            className={cn(
              "chip cursor-pointer transition",
              TRACK_STYLES[t],
              trackFilter === t
                ? "ring-2 ring-offset-1 ring-offset-background"
                : "opacity-60 hover:opacity-100"
            )}
            title={`${TRACK_LABELS[t]} (${trackCounts[t]} videos)`}
          >
            <span>{t}</span>
            <span className="num font-normal opacity-70">{trackCounts[t]}</span>
          </button>
        ))}
        {trackFilter !== "ALL" && (
          <button
            type="button"
            onClick={() => setTrackFilter("ALL")}
            className="cursor-pointer text-[10.5px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            clear
          </button>
        )}
      </div>

      <span className="h-5 w-px bg-border" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="cursor-pointer">
            <Filter className="mr-1 h-3.5 w-3.5" />
            {filter === "ALL" ? "All status" : filter}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setFilter("ALL")}>All statuses</DropdownMenuItem>
          {STATUSES.map((s) => (
            <DropdownMenuItem key={s} onSelect={() => setFilter(s)}>
              <span className={cn("chip mr-2", STATUS_STYLES[s])}>{s}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="ml-auto flex items-center gap-2">
        {count > 0 ? (
          <>
            <span className="num text-[12px] font-medium text-muted-foreground">
              {count} selected
            </span>
            <Button
              size="sm"
              variant="outline"
              className="cursor-pointer"
              onClick={() => { bulkPatch(ids, { status: "REVIEW" }); clearSelection(); }}
            >
              <SendHorizonal className="mr-1 h-3.5 w-3.5" /> To review
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="cursor-pointer"
              onClick={() => { bulkPatch(ids, { status: "APPROVED" }); clearSelection(); }}
            >
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="cursor-pointer text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => bulkRemove(ids)}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" className="cursor-pointer" onClick={() => addRow()}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add row
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="cursor-pointer text-muted-foreground hover:text-foreground"
              onClick={reset}
              title="Reset to agarwood plan"
              aria-label="Reset to agarwood plan"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
