"use client";

import { useMemo, useState } from "react";
import { Image as ImageIcon, Upload, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { STATUS_STYLES, TRACK_STYLES, type Track } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

const TRACKS: (Track | "ALL")[] = ["ALL", "A", "B", "C", "D"];

export function LibraryView() {
  const rows = useStore((s) => s.rows);
  const patch = useStore((s) => s.patch);
  const select = useStore((s) => s.select);
  const setSection = useStore((s) => s.setSection);

  const [filter, setFilter] = useState<Track | "ALL">("ALL");
  const [onlyWithThumb, setOnlyWithThumb] = useState(false);

  const visible = useMemo(() => {
    let r = rows;
    if (filter !== "ALL") r = r.filter((x) => x.track === filter);
    if (onlyWithThumb) r = r.filter((x) => !!x.thumbnailUrl);
    return r;
  }, [rows, filter, onlyWithThumb]);

  const withThumbs = rows.filter((r) => r.thumbnailUrl).length;

  return (
    <div className="h-full overflow-auto">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur">
        <h2 className="text-[15px] font-semibold tracking-tight">Library</h2>
        <span className="text-[11px] text-muted-foreground">{visible.length} of {rows.length} videos · {withThumbs} with thumbnail</span>

        <div className="ml-2 flex items-center gap-1.5">
          {TRACKS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilter(t)}
              className={cn(
                "cursor-pointer rounded-full px-2.5 py-1 text-[10.5px] font-semibold ring-1 ring-inset transition",
                t === "ALL"
                  ? filter === "ALL" ? "bg-foreground text-background ring-foreground" : "bg-muted ring-border text-muted-foreground hover:text-foreground"
                  : filter === t ? cn(TRACK_STYLES[t as Track], "ring-2 ring-offset-1 ring-offset-background") : cn(TRACK_STYLES[t as Track], "opacity-60 hover:opacity-100")
              )}
            >
              {t === "ALL" ? "All" : t}
            </button>
          ))}
        </div>

        <label className="ml-2 flex cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground">
          <input
            type="checkbox"
            checked={onlyWithThumb}
            onChange={(e) => setOnlyWithThumb(e.target.checked)}
          />
          Only with thumbnail
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {visible.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => { select(row.id); setSection("sheet"); }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (!f) return;
              patch(row.id, { thumbnailUrl: URL.createObjectURL(f) });
            }}
            className="group flex cursor-pointer flex-col overflow-hidden rounded-lg border border-border bg-card text-left transition hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-md"
            title={`Open ${row.title || "Untitled"} in Sheet (or drop image to set thumbnail)`}
          >
            <div className="relative aspect-video w-full overflow-hidden bg-muted/40">
              {row.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={row.thumbnailUrl} alt={row.title} className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                  <ImageIcon className="h-7 w-7" />
                </div>
              )}
              {row.thumbnailUrl && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    patch(row.id, { thumbnailUrl: undefined });
                  }}
                  className="absolute right-1.5 top-1.5 hidden h-6 w-6 cursor-pointer items-center justify-center rounded bg-foreground/70 text-background hover:bg-foreground group-hover:flex"
                  title="Remove thumbnail"
                  aria-label="Remove thumbnail"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              {!row.thumbnailUrl && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-foreground/60 py-1 text-[10px] font-medium text-background opacity-0 transition group-hover:opacity-100">
                  <Upload className="h-3 w-3" /> Drop image to set
                </div>
              )}
            </div>
            <div className="space-y-1.5 p-2.5">
              <div className="flex items-center gap-1.5">
                {row.track && (
                  <span className={cn("chip", TRACK_STYLES[row.track])}>{row.track}</span>
                )}
                <span className={cn("chip", STATUS_STYLES[row.status])}>{row.status}</span>
                {row.weekIndex !== undefined && (
                  <span className="num text-[10px] text-muted-foreground">
                    W{String(row.weekIndex).padStart(2, "0")}·{row.publishSlot?.[0]}
                  </span>
                )}
              </div>
              <div className="line-clamp-2 text-[12px] font-medium leading-snug text-foreground">
                {row.title || "Untitled"}
              </div>
              {row.scheduledAt && (
                <div className="text-[10px] text-muted-foreground">
                  {formatDate(row.scheduledAt)}
                </div>
              )}
            </div>
          </button>
        ))}
        {visible.length === 0 && (
          <div className="col-span-full py-16 text-center text-sm text-muted-foreground">
            No videos match this filter.
          </div>
        )}
      </div>
    </div>
  );
}
