"use client";

import { useMemo } from "react";
import { Film, FileEdit, CheckCircle2, CalendarClock, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface KpiProps {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Film;
  tone?: "default" | "primary" | "accent";
}

function Kpi({ label, value, hint, icon: Icon, tone = "default" }: KpiProps) {
  const toneClass =
    tone === "primary"
      ? "text-primary"
      : tone === "accent"
      ? "text-orange-500 dark:text-orange-400"
      : "text-foreground/80";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3.5 py-3 transition hover:border-foreground/15 hover:shadow-sm">
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted", toneClass)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          {label}
        </div>
        <div className="flex items-baseline gap-1.5 leading-tight">
          <span className={cn("num text-lg font-semibold", toneClass)}>{value}</span>
          {hint && <span className="truncate text-[11px] text-muted-foreground">{hint}</span>}
        </div>
      </div>
    </div>
  );
}

export function KpiStrip() {
  const rows = useStore((s) => s.rows);

  const stats = useMemo(() => {
    const total = rows.length;
    const drafted = rows.filter((r) => r.status === "DRAFT" || r.status === "REVIEW").length;
    const approved = rows.filter((r) => r.status === "APPROVED").length;
    const published = rows.filter((r) => r.status === "PUBLISHED").length;

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    const thisWeek = rows.filter((r) => {
      if (!r.scheduledAt) return false;
      const d = new Date(r.scheduledAt);
      return d >= weekStart && d < weekEnd;
    }).length;

    const totalAi = rows.reduce((s, r) => s + (r.aiCost || 0), 0);

    return { total, drafted, approved, published, thisWeek, totalAi };
  }, [rows]);

  return (
    <div className="grid grid-cols-2 gap-3 px-4 pb-3 pt-4 md:grid-cols-3 xl:grid-cols-5">
      <Kpi
        icon={Film}
        label="Total videos"
        value={String(stats.total)}
        hint={`${stats.published} live · ${stats.approved} ready`}
      />
      <Kpi
        icon={FileEdit}
        label="In progress"
        value={String(stats.drafted)}
        hint="Draft + Review"
        tone="primary"
      />
      <Kpi
        icon={CheckCircle2}
        label="Approved"
        value={String(stats.approved)}
        hint="Awaiting publish"
      />
      <Kpi
        icon={CalendarClock}
        label="This week"
        value={String(stats.thisWeek)}
        hint="Scheduled"
        tone="accent"
      />
      <Kpi
        icon={Sparkles}
        label="AI spend"
        value={`$${stats.totalAi.toFixed(2)}`}
        hint="All-time"
      />
    </div>
  );
}
