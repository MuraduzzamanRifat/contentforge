"use client";

import {
  Search, Sun, Moon, Plug, CheckCircle2, Sparkles, Settings,
  Workflow as WorkflowIcon, Table2, Clapperboard, Megaphone, Calendar, BarChart3,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useStore, type Section } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ConnectionsDialog } from "./ConnectionsDialog";
import { cn } from "@/lib/utils";
import { waitingOn, workflowColumn } from "@/lib/workflow";

interface ConnState {
  provider: "claude-subscription" | "openai" | "claude-api" | "none";
  providerLabel: string;
}

const NAV: { id: Section; label: string; icon: typeof Table2 }[] = [
  { id: "sheet",      label: "Sheet",      icon: Table2 },
  { id: "workflow",   label: "Workflow",   icon: WorkflowIcon },
  { id: "production", label: "Production",  icon: Clapperboard },
  { id: "publish",    label: "Publish",    icon: Megaphone },
  { id: "calendar",   label: "Calendar",   icon: Calendar },
  { id: "analytics",  label: "Analytics",  icon: BarChart3 },
  { id: "settings",   label: "Settings",   icon: Settings },
];

export function Topbar() {
  const { search, setSearch, dark, toggleDark } = useStore();
  const section = useStore((s) => s.section);
  const setSection = useStore((s) => s.setSection);
  const rowCount = useStore((s) => s.rows.length);
  const onMeCount = useStore(
    (s) => s.rows.filter((r) => workflowColumn(r) !== null && waitingOn(r, s.comments[r.id] ?? []) === "me").length
  );
  const productionCount = useStore(
    (s) => s.rows.filter((r) => ((r.status === "APPROVED" && r.productionLocked) || !!r.production) && !r.production?.finalizedAt).length
  );

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [conn, setConn] = useState<ConnState | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      const slash = e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA";
      if (meta || slash) { e.preventDefault(); inputRef.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) return;
    fetch("/api/connections").then((r) => r.json()).then(setConn).catch(() => setConn(null));
  }, [open]);

  const aiOk = !!conn && conn.provider !== "none";
  const aiShort =
    conn?.provider === "claude-subscription" ? "Claude Pro/Max"
    : conn?.provider === "openai" ? "OpenAI"
    : conn?.provider === "claude-api" ? "Claude API"
    : "Not connected";

  const badge = (id: Section) =>
    id === "workflow" && onMeCount > 0 ? { n: onMeCount, c: "bg-blue-600" }
    : id === "production" && productionCount > 0 ? { n: productionCount, c: "bg-violet-600" }
    : null;

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card/60 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/40">
        {/* Brand + workspace */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-primary to-accent shadow-sm">
            <Sparkles className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <div className="hidden leading-tight sm:block">
            <div className="text-[13px] font-semibold">ContentForge</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Agarwood · {rowCount} videos
            </div>
          </div>
        </div>

        <span className="h-6 w-px bg-border" />

        {/* Horizontal nav — replaces the old left sidebar (no page width lost) */}
        <nav className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
          {NAV.map(({ id, label, icon: Icon }) => {
            const active = section === id;
            const b = badge(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSection(id)}
                className={cn(
                  "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                  active ? "bg-primary/10 text-primary" : "text-foreground/70 hover:bg-muted hover:text-foreground"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden md:inline">{label}</span>
                {b && (
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white tabular-nums", b.c)}>
                    {b.n}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            aria-label="Search content"
            className="h-9 w-44 rounded-md border border-input bg-background pl-8 pr-9 text-[13px] outline-none transition focus:w-60 focus:border-ring"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            /
          </kbd>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-[12px] font-medium transition hover:bg-muted",
            aiOk ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"
          )}
          title={conn?.providerLabel ?? "Connections"}
          aria-label="Open Connections panel"
        >
          {aiOk ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Plug className="h-3.5 w-3.5" />}
          <span className="hidden lg:inline">AI</span>
          <span className="hidden text-[10px] opacity-80 lg:inline">· {aiShort}</span>
        </button>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDark}
          title={dark ? "Switch to light" : "Switch to dark"}
          aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
          className="shrink-0 cursor-pointer"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </header>

      <ConnectionsDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
