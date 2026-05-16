"use client";

import { useState } from "react";
import { Workflow as WorkflowIcon, Table2, MessagesSquare, Clapperboard, Megaphone, Calendar, BarChart3, Image as ImageIcon, Settings, ChevronsLeft, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore, type Section } from "@/lib/store";
import { waitingOn, workflowColumn } from "@/lib/workflow";

const NAV: { id: Section; label: string; icon: typeof Table2 }[] = [
  { id: "workflow",  label: "Workflow",  icon: WorkflowIcon },
  { id: "sheet",     label: "Sheet",     icon: Table2 },
  { id: "review",    label: "Review",    icon: MessagesSquare },
  { id: "production", label: "Production", icon: Clapperboard },
  { id: "publish",   label: "Publish",   icon: Megaphone },
  { id: "calendar",  label: "Calendar",  icon: Calendar },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "library",   label: "Library",   icon: ImageIcon },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const section = useStore((s) => s.section);
  const setSection = useStore((s) => s.setSection);
  const rowCount = useStore((s) => s.rows.length);
  const reviewCount = useStore((s) => s.rows.filter((r) => r.status === "REVIEW").length);
  const onMeCount = useStore(
    (s) =>
      s.rows.filter(
        (r) => workflowColumn(r) !== null && waitingOn(r, s.comments[r.id] ?? []) === "me"
      ).length
  );
  const productionCount = useStore(
    (s) =>
      s.rows.filter(
        (r) => ((r.status === "APPROVED" && r.productionLocked) || !!r.production) && !r.production?.finalizedAt
      ).length
  );

  return (
    <aside
      className={cn(
        "relative flex h-screen flex-col border-r border-border bg-card transition-[width] duration-200",
        collapsed ? "w-[64px]" : "w-[232px]"
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-border px-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-primary to-accent shadow-sm">
          <Sparkles className="h-4 w-4 text-white" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold leading-tight">ContentForge</div>
            <div className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
              Production Studio
            </div>
          </div>
        )}
      </div>

      <div className="px-3 pt-3">
        <button
          type="button"
          className={cn(
            "flex w-full cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-left text-[12px] transition hover:bg-muted",
            collapsed && "justify-center"
          )}
          title="Agarwood · Daracheon"
        >
          <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
          {!collapsed && (
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate font-medium">Agarwood</span>
              <span className="truncate text-[10px] text-muted-foreground">Daracheon · {rowCount} videos</span>
            </span>
          )}
        </button>
      </div>

      <nav className="mt-4 flex-1 space-y-0.5 px-2">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = section === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              className={cn(
                "group flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-foreground/70 hover:bg-muted hover:text-foreground",
                collapsed && "justify-center"
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
              {!collapsed && (
                <>
                  <span className="flex-1 truncate text-left">{label}</span>
                  {id === "review" && reviewCount > 0 && (
                    <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-white tabular-nums">
                      {reviewCount}
                    </span>
                  )}
                  {id === "workflow" && onMeCount > 0 && (
                    <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold text-white tabular-nums">
                      {onMeCount}
                    </span>
                  )}
                  {id === "production" && productionCount > 0 && (
                    <span className="rounded-full bg-violet-600 px-1.5 py-0.5 text-[9px] font-bold text-white tabular-nums">
                      {productionCount}
                    </span>
                  )}
                  {active && <span className="h-1 w-1 rounded-full bg-primary" />}
                </>
              )}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-border p-2">
        <button
          type="button"
          onClick={() => setSection("settings")}
          className={cn(
            "flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors",
            section === "settings"
              ? "bg-primary/10 text-primary"
              : "text-foreground/70 hover:bg-muted hover:text-foreground",
            collapsed && "justify-center"
          )}
        >
          <Settings className={cn("h-4 w-4 shrink-0", section === "settings" && "text-primary")} />
          {!collapsed && <span className="flex-1 truncate text-left">Settings</span>}
        </button>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            "mt-1 flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            collapsed && "justify-center"
          )}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronsLeft
            className={cn("h-4 w-4 shrink-0 transition-transform", collapsed && "rotate-180")}
          />
          {!collapsed && <span className="flex-1 truncate text-left">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
