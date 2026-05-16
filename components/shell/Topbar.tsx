"use client";

import { Search, Sun, Moon, Keyboard, ChevronRight, Plug, CheckCircle2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ConnectionsDialog } from "./ConnectionsDialog";
import { cn } from "@/lib/utils";

interface ConnState {
  claude: { auth: "subscription" | "api-key" | "none" };
  gemini: { available: boolean };
  googleFlow: { programmatic: boolean };
}

export function Topbar() {
  const { search, setSearch, dark, toggleDark } = useStore();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [conn, setConn] = useState<ConnState | null>(null);
  const [open, setOpen] = useState(false);

  // Cmd/Ctrl+K and "/" focus the search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      const slash = e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA";
      if (meta || slash) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Fetch connection status on mount + every time dialog closes (in case user updated .env)
  useEffect(() => {
    if (open) return; // refresh handled inside dialog
    fetch("/api/connections")
      .then((r) => r.json())
      .then(setConn)
      .catch(() => setConn(null));
  }, [open]);

  const claudeOk = conn?.claude.auth !== "none";
  const claudeLabel =
    conn?.claude.auth === "subscription" ? "Pro / Max"
    : conn?.claude.auth === "api-key" ? "API key"
    : "Not connected";

  return (
    <>
      <header className="flex h-14 items-center gap-3 border-b border-border bg-card/60 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/40">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <span>Workspace</span>
          <ChevronRight className="h-3.5 w-3.5 opacity-50" />
          <span className="text-foreground">Agarwood</span>
          <ChevronRight className="h-3.5 w-3.5 opacity-50" />
          <span className="text-foreground">Sheet</span>
        </nav>

        <div className="relative ml-auto">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search videos…"
            aria-label="Search content"
            className="h-9 w-72 rounded-md border border-input bg-background pl-8 pr-12 text-[13px] outline-none transition focus:border-ring"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            /
          </kbd>
        </div>

        {/* Connection status pill */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-[12px] font-medium transition hover:bg-muted",
            claudeOk ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"
          )}
          title="Open Connections"
          aria-label="Open Connections panel"
        >
          {claudeOk ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Plug className="h-3.5 w-3.5" />}
          <span>Claude</span>
          <span className="num text-[10px] font-normal opacity-70">·</span>
          <span className="text-[10px] opacity-80">{claudeLabel}</span>
        </button>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDark}
          title={dark ? "Switch to light" : "Switch to dark"}
          aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
          className="cursor-pointer"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <Button variant="ghost" size="icon" title="Keyboard shortcuts" aria-label="Keyboard shortcuts" className="cursor-pointer">
          <Keyboard className="h-4 w-4" />
        </Button>

        <div className="h-7 w-7 cursor-pointer rounded-full bg-gradient-to-br from-primary to-accent ring-2 ring-card" title="Muraduzzaman" />
      </header>

      <ConnectionsDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
