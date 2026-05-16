"use client";

import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn, formatCost, formatDate } from "@/lib/utils";
import { buildDuplicateIndex, severity } from "@/lib/dedupe";
import { EditableCell } from "./EditableCell";
import { StatusCell } from "./StatusCell";
import { TrackCell } from "./TrackCell";
import { RowActions } from "./RowActions";

const SEV_FLAG: Record<"low" | "medium" | "high", string> = {
  low: "text-amber-500",
  medium: "text-orange-500",
  high: "text-red-500",
};

export function ContentSheet() {
  const { rows, filter, trackFilter, search, selectedId, selectedIds, select, toggleSelect } = useStore();

  const dupIndex = useMemo(() => buildDuplicateIndex(rows), [rows]);

  const visible = useMemo(() => {
    let r = rows;
    if (filter !== "ALL") r = r.filter((x) => x.status === filter);
    if (trackFilter !== "ALL") r = r.filter((x) => x.track === trackFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(
        (x) =>
          x.title.toLowerCase().includes(q) ||
          x.hook.toLowerCase().includes(q) ||
          (x.category ?? "").toLowerCase().includes(q) ||
          x.tags.some((t) => t.includes(q))
      );
    }
    return r;
  }, [rows, filter, trackFilter, search]);

  return (
    <div className="h-full overflow-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="sheet-header">
            <th className="sheet-cell w-10 text-center">
              <input
                type="checkbox"
                aria-label="select all visible"
                onChange={(e) => {
                  const state = useStore.getState();
                  if (e.target.checked) visible.forEach((r) => state.toggleSelect(r.id));
                  else state.clearSelection();
                }}
              />
            </th>
            <th className="sheet-cell w-10 text-center">#</th>
            <th className="sheet-cell w-28">Track</th>
            <th className="sheet-cell w-28">Status</th>
            <th className="sheet-cell w-[34%]">Title</th>
            <th className="sheet-cell w-[26%]">Hook</th>
            <th className="sheet-cell w-32">Category</th>
            <th className="sheet-cell w-24 text-right">Scheduled</th>
            <th className="sheet-cell w-20 text-right">AI $</th>
            <th className="sheet-cell w-10"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {visible.map((row) => {
            const isSelected = selectedIds.has(row.id);
            const isActive = selectedId === row.id;
            const dupes = dupIndex.get(row.id) ?? [];
            const topDup = dupes[0];
            const topSev = topDup ? severity(topDup.score) : null;
            // Only flag in the sheet if at least medium severity; weaker overlaps still show in preview panel.
            const sev = topSev === "low" ? null : topSev;
            return (
              <tr
                key={row.id}
                className={cn(
                  "sheet-row cursor-pointer",
                  isSelected && "selected",
                  isActive && "active"
                )}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("input,textarea,button,[role=menuitem]")) return;
                  select(row.id);
                }}
              >
                <td className="sheet-cell text-center">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(row.id)}
                    aria-label={`Select row ${row.rowIndex + 1}`}
                  />
                </td>
                <td className="sheet-cell text-center text-xs text-muted-foreground num">
                  {row.rowIndex + 1}
                </td>
                <td className="sheet-cell">
                  <TrackCell track={row.track} weekIndex={row.weekIndex} slot={row.publishSlot} />
                </td>
                <td className="sheet-cell">
                  <StatusCell id={row.id} status={row.status} />
                </td>
                <td className="sheet-cell">
                  <div className="flex items-center gap-1.5">
                    {sev && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); select(row.id); }}
                        title={`${dupes.length} possible overlap${dupes.length > 1 ? "s" : ""} — top match ${(topDup.score * 100).toFixed(0)}% with "${topDup.row.title}"`}
                        aria-label={`${dupes.length} possible duplicates`}
                        className="cursor-pointer"
                      >
                        <AlertTriangle className={cn("h-3.5 w-3.5", SEV_FLAG[sev])} />
                      </button>
                    )}
                    <div className="flex-1 min-w-0">
                      <EditableCell id={row.id} field="title" value={row.title} placeholder="Untitled video..." />
                    </div>
                  </div>
                </td>
                <td className="sheet-cell">
                  <EditableCell id={row.id} field="hook" value={row.hook} placeholder="Opening line..." />
                </td>
                <td className="sheet-cell truncate text-xs text-muted-foreground">
                  {row.category ?? "—"}
                </td>
                <td className="sheet-cell text-right text-xs text-muted-foreground">
                  {formatDate(row.scheduledAt)}
                </td>
                <td className="sheet-cell text-right num text-xs text-muted-foreground">
                  {formatCost(row.aiCost)}
                </td>
                <td className="sheet-cell">
                  <RowActions row={row} />
                </td>
              </tr>
            );
          })}
          {visible.length === 0 && (
            <tr>
              <td colSpan={10} className="sheet-cell py-16 text-center text-sm text-muted-foreground">
                No rows match. Clear the filter or search.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
