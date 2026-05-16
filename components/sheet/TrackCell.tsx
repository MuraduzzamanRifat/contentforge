"use client";

import type { Track } from "@/lib/types";
import { TRACK_STYLES, TRACK_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TrackCell({ track, weekIndex, slot }: { track?: Track | null; weekIndex?: number; slot?: string }) {
  if (!track) return <span className="text-xs text-muted-foreground/50">—</span>;
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset",
          TRACK_STYLES[track]
        )}
        title={TRACK_LABELS[track]}
      >
        {track}
      </span>
      {weekIndex !== undefined && (
        <span className="text-[10px] text-muted-foreground tabular-nums">
          W{String(weekIndex).padStart(2, "0")}·{slot?.slice(0, 1) ?? ""}
        </span>
      )}
    </div>
  );
}
