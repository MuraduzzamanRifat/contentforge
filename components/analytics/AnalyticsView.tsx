"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { STATUSES, STATUS_STYLES, TRACK_STYLES, TRACK_LABELS, type ContentStatus, type Track } from "@/lib/types";
import { cn, formatCost } from "@/lib/utils";

interface StatusCount { status: ContentStatus; count: number }
interface TrackCount { track: Track; count: number }
interface WeekStat { week: number; total: number; published: number; approved: number }
interface CategoryStat { category: string; count: number }

export function AnalyticsView() {
  const rows = useStore((s) => s.rows);

  const stats = useMemo(() => {
    const total = rows.length;
    const byStatus: StatusCount[] = STATUSES.map((s) => ({ status: s, count: rows.filter((r) => r.status === s).length }));
    const byTrack: TrackCount[] = (["A", "B", "C", "D"] as Track[]).map((t) => ({
      track: t, count: rows.filter((r) => r.track === t).length,
    }));

    const weekMap = new Map<number, WeekStat>();
    for (const r of rows) {
      if (r.weekIndex === undefined) continue;
      const bucket = weekMap.get(r.weekIndex) ?? { week: r.weekIndex, total: 0, published: 0, approved: 0 };
      bucket.total++;
      if (r.status === "PUBLISHED") bucket.published++;
      if (r.status === "APPROVED" || r.status === "SCHEDULED") bucket.approved++;
      weekMap.set(r.weekIndex, bucket);
    }
    const byWeek = [...weekMap.values()].sort((a, b) => a.week - b.week);

    const catMap = new Map<string, number>();
    for (const r of rows) {
      const c = r.category ?? "—";
      catMap.set(c, (catMap.get(c) ?? 0) + 1);
    }
    const byCategory: CategoryStat[] = [...catMap.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const totalCost = rows.reduce((s, r) => s + (r.aiCost || 0), 0);
    const avgCost = total > 0 ? totalCost / total : 0;
    const published = byStatus.find((s) => s.status === "PUBLISHED")?.count ?? 0;
    const completion = total > 0 ? (published / total) * 100 : 0;

    return { total, byStatus, byTrack, byWeek, byCategory, totalCost, avgCost, completion, published };
  }, [rows]);

  const maxStatusCount = Math.max(1, ...stats.byStatus.map((s) => s.count));
  const maxTrackCount = Math.max(1, ...stats.byTrack.map((t) => t.count));
  const maxWeekTotal = Math.max(1, ...stats.byWeek.map((w) => w.total));
  const maxCatCount = Math.max(1, ...stats.byCategory.map((c) => c.count));

  return (
    <div className="h-full space-y-4 overflow-auto p-4">
      <div className="flex items-center gap-3">
        <h2 className="text-[15px] font-semibold tracking-tight">Analytics</h2>
        <span className="text-[11px] text-muted-foreground">{stats.total} videos · {stats.published} published · {stats.completion.toFixed(1)}% complete</span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total videos" value={stats.total.toString()} />
        <StatCard label="Published" value={stats.published.toString()} tone="primary" />
        <StatCard label="Completion" value={`${stats.completion.toFixed(1)}%`} tone="accent" />
        <StatCard label="AI spend" value={formatCost(stats.totalCost)} hint={`avg ${formatCost(stats.avgCost)}/video`} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Status breakdown */}
        <section className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Status breakdown</h3>
          <div className="space-y-1.5">
            {stats.byStatus.map(({ status, count }) => (
              <div key={status} className="flex items-center gap-3">
                <span className={cn("chip w-24 justify-center", STATUS_STYLES[status])}>{status}</span>
                <div className="relative h-5 flex-1 overflow-hidden rounded bg-muted">
                  <div
                    className="absolute inset-y-0 left-0 rounded bg-foreground/70 transition-all"
                    style={{ width: `${(count / maxStatusCount) * 100}%` }}
                  />
                </div>
                <span className="num w-10 text-right text-[12px] font-medium tabular-nums">{count}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Track breakdown */}
        <section className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">By track</h3>
          <div className="space-y-1.5">
            {stats.byTrack.map(({ track, count }) => (
              <div key={track} className="flex items-center gap-3">
                <span className={cn("chip w-24 justify-center", TRACK_STYLES[track])}>
                  {track} · {TRACK_LABELS[track]}
                </span>
                <div className="relative h-5 flex-1 overflow-hidden rounded bg-muted">
                  <div
                    className="absolute inset-y-0 left-0 rounded bg-foreground/70 transition-all"
                    style={{ width: `${(count / maxTrackCount) * 100}%` }}
                  />
                </div>
                <span className="num w-10 text-right text-[12px] font-medium tabular-nums">{count}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Production by week */}
      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Production by week (4 slots/week)</h3>
        <div className="flex items-end gap-[2px] overflow-x-auto" style={{ height: 160 }}>
          {stats.byWeek.map((w) => {
            const publishedH = (w.published / maxWeekTotal) * 140;
            const approvedH = (w.approved / maxWeekTotal) * 140;
            const remH = ((w.total - w.published - w.approved) / maxWeekTotal) * 140;
            return (
              <div key={w.week} className="group relative flex w-4 shrink-0 flex-col justify-end" title={`W${w.week} · ${w.published} pub · ${w.approved} ready · ${w.total} total`}>
                {publishedH > 0 && <div className="bg-emerald-500" style={{ height: publishedH }} />}
                {approvedH > 0 && <div className="bg-emerald-300" style={{ height: approvedH }} />}
                {remH > 0 && <div className="bg-muted-foreground/30" style={{ height: remH }} />}
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex items-center gap-3 text-[10.5px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500" /> Published</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-300" /> Approved/Scheduled</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-muted-foreground/30" /> Remaining</span>
        </div>
      </section>

      {/* Top categories */}
      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Top categories (10)</h3>
        <div className="space-y-1.5">
          {stats.byCategory.map(({ category, count }) => (
            <div key={category} className="flex items-center gap-3">
              <span className="w-44 truncate text-[12px] font-medium" title={category}>{category}</span>
              <div className="relative h-4 flex-1 overflow-hidden rounded bg-muted">
                <div
                  className="absolute inset-y-0 left-0 rounded bg-primary/60 transition-all"
                  style={{ width: `${(count / maxCatCount) * 100}%` }}
                />
              </div>
              <span className="num w-8 text-right text-[12px] tabular-nums">{count}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "primary" | "accent" }) {
  const toneClass = tone === "primary" ? "text-primary" : tone === "accent" ? "text-orange-500 dark:text-orange-400" : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card p-3.5">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className={cn("num text-2xl font-semibold leading-tight", toneClass)}>{value}</span>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}
