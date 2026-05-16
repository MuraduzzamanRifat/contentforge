"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import type { Content } from "@/lib/types";
import { STATUS_STYLES, TRACK_STYLES } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

const SLOTS = ["Mon", "Wed", "Fri", "Sun"] as const;

interface WeekRow {
  weekIndex: number;
  cells: Record<(typeof SLOTS)[number], Content | undefined>;
  startDate?: string;
}

export function CalendarView() {
  const rows = useStore((s) => s.rows);
  const trackFilter = useStore((s) => s.trackFilter);
  const select = useStore((s) => s.select);
  const setSection = useStore((s) => s.setSection);
  const selectedId = useStore((s) => s.selectedId);

  const weeks = useMemo(() => {
    const filtered = trackFilter === "ALL" ? rows : rows.filter((r) => r.track === trackFilter);
    const map = new Map<number, WeekRow>();
    for (const r of filtered) {
      if (r.weekIndex === undefined || !r.publishSlot) continue;
      const slot = r.publishSlot as (typeof SLOTS)[number];
      if (!SLOTS.includes(slot)) continue;
      let bucket = map.get(r.weekIndex);
      if (!bucket) {
        bucket = {
          weekIndex: r.weekIndex,
          cells: { Mon: undefined, Wed: undefined, Fri: undefined, Sun: undefined },
        };
        map.set(r.weekIndex, bucket);
      }
      bucket.cells[slot] = r;
      if (slot === "Mon") bucket.startDate = r.scheduledAt ?? undefined;
    }
    return [...map.values()].sort((a, b) => a.weekIndex - b.weekIndex);
  }, [rows, trackFilter]);

  // Identify "this week" by comparing today against each week's Monday date.
  const todayWeek = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const w of weeks) {
      if (!w.startDate) continue;
      const start = new Date(w.startDate);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      if (today >= start && today < end) return w.weekIndex;
    }
    return null;
  }, [weeks]);

  return (
    <div className="h-full overflow-auto">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur">
        <h2 className="text-[15px] font-semibold tracking-tight">Calendar</h2>
        <span className="text-[11px] text-muted-foreground">
          65 weeks · Mon / Wed / Fri / Sun · click any cell to open
        </span>
      </div>

      <div className="px-4 py-3">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="w-14 px-2 py-1.5 text-left">Wk</th>
              {SLOTS.map((s) => (
                <th key={s} className="px-2 py-1.5 text-left">{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((w) => (
              <tr key={w.weekIndex} className={cn("align-top", todayWeek === w.weekIndex && "bg-primary/[0.04]")}>
                <td className="w-14 border-t border-border px-2 py-1.5 text-[11px] font-medium text-muted-foreground num">
                  <div className="flex flex-col">
                    <span>W{String(w.weekIndex).padStart(2, "0")}</span>
                    {w.startDate && <span className="text-[10px] opacity-60">{formatDate(w.startDate)}</span>}
                  </div>
                </td>
                {SLOTS.map((slot) => {
                  const cell = w.cells[slot];
                  if (!cell) {
                    return (
                      <td key={slot} className="border-t border-l border-border px-2 py-1.5">
                        <span className="text-[11px] text-muted-foreground/50">—</span>
                      </td>
                    );
                  }
                  const active = selectedId === cell.id;
                  return (
                    <td key={slot} className="border-t border-l border-border p-0">
                      <button
                        type="button"
                        onClick={() => { select(cell.id); setSection("sheet"); }}
                        className={cn(
                          "group flex w-full cursor-pointer flex-col gap-1 rounded-sm px-2 py-1.5 text-left transition hover:bg-muted/60",
                          active && "ring-2 ring-inset ring-primary/40"
                        )}
                        title={`${cell.title} (open in Sheet)`}
                      >
                        <div className="flex items-center gap-1.5">
                          {cell.track && (
                            <span className={cn("inline-flex h-4 items-center rounded px-1 text-[9px] font-bold ring-1 ring-inset", TRACK_STYLES[cell.track])}>
                              {cell.track}
                            </span>
                          )}
                          <span className={cn("chip", STATUS_STYLES[cell.status])}>{cell.status}</span>
                        </div>
                        <div className="line-clamp-2 text-[11.5px] leading-snug text-foreground/85 group-hover:text-foreground">
                          {cell.title || "Untitled"}
                        </div>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
            {weeks.length === 0 && (
              <tr>
                <td colSpan={5} className="py-16 text-center text-sm text-muted-foreground">
                  No videos match the current track filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
