"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, RotateCcw, Download, RefreshCcw, FileCode } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BRAND, SPECIES, PRODUCTION, ANIMATION } from "@/lib/project-config";

interface Connections {
  provider: "claude-subscription" | "openai" | "claude-api" | "none";
  providerLabel: string;
  claude: { available: boolean; auth: "subscription" | "api-key" | "none"; accountHint?: string };
  gemini: { available: boolean };
  googleFlow: { programmatic: boolean };
}

export function SettingsView() {
  const rows = useStore((s) => s.rows);
  const reset = useStore((s) => s.reset);
  const dark = useStore((s) => s.dark);
  const toggleDark = useStore((s) => s.toggleDark);

  const [conn, setConn] = useState<Connections | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const r = await fetch("/api/connections", { cache: "no-store" });
      setConn(await r.json());
    } finally {
      setRefreshing(false);
    }
  };
  useEffect(() => { refresh(); }, []);

  const exportCsv = () => {
    const headers = [
      "rowIndex","track","weekIndex","publishSlot","category","status","title","hook",
      "scheduledAt","publishedAt","youtubeId","aiCost",
    ];
    const escape = (v: unknown) => {
      const s = v === undefined || v === null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.join(",")];
    for (const r of rows) {
      lines.push(headers.map((h) => escape((r as unknown as Record<string, unknown>)[h])).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contentforge-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const aiLabel = conn?.providerLabel ?? "Not connected";
  const aiOk = !!conn && conn.provider !== "none";

  return (
    <div className="h-full space-y-4 overflow-auto p-4">
      <h2 className="text-[15px] font-semibold tracking-tight">Settings</h2>

      {/* Connections */}
      <section className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Connections</h3>
          <Button size="sm" variant="outline" onClick={refresh} disabled={refreshing} className="cursor-pointer">
            <RefreshCcw className={cn("mr-1 h-3.5 w-3.5", refreshing && "animate-spin")} />
            Re-check
          </Button>
        </div>
        <div className="space-y-2">
          <ConnRow ok={aiOk} label="AI provider" value={aiLabel} hint="OPENAI_API_KEY (simplest — works on Vercel), or Claude subscription / CLAUDE_CODE_OAUTH_TOKEN locally, or ANTHROPIC_API_KEY." />
          <ConnRow ok={!!conn?.gemini.available} label="Gemini / Veo" value={conn?.gemini.available ? "GEMINI_API_KEY set" : "Not configured"} hint="Add GEMINI_API_KEY to .env.local for programmatic Veo. Otherwise Google Flow opens in a new tab." />
          <ConnRow ok={false} label="YouTube" value="Manual upload" hint="You upload videos yourself; ContentForge stores the video ID after the fact." />
        </div>
      </section>

      {/* Workspace */}
      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Workspace</h3>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-[12px] md:grid-cols-2">
          <Row label="Brand" value={BRAND.brandEnglish} />
          <Row label="Company" value={BRAND.company} />
          <Row label="Site" value={BRAND.site} />
          <Row label="Species" value={SPECIES.scientific} />
          <Row label="Farms" value={PRODUCTION.farms} />
          <Row label="Build" value="6 stages · 20+ yr + 3–5 yr induction" />
          <Row label="Videos in plan" value={`${rows.length} rows · 65 weeks`} />
          <Row label="Animation rule" value={ANIMATION.style} />
        </dl>
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2 text-[11px] text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          Brand facts are source-controlled in <code className="font-mono">lib/project-config.ts</code>. Edit there to update everywhere (preview panel, CTA block, Claude system prompt).
        </p>
      </section>

      {/* Prompt */}
      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Claude prompt</h3>
        <p className="text-[12px] text-muted-foreground">
          The Generate-with-Claude system prompt enforces the three channel rules (factual sourcing, no repetition, Daracheon CTA) and is engineered via <code className="font-mono">/senior-prompt-engineer</code>. Source is co-located in{" "}
          <code className="font-mono">lib/prompts/script-system.ts</code>.
        </p>
        <a
          href="/api/ai/script"
          className="mt-2 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
        >
          <FileCode className="h-3 w-3" /> POST endpoint: /api/ai/script
        </a>
      </section>

      {/* Appearance */}
      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Appearance</h3>
        <label className="flex cursor-pointer items-center gap-2 text-[12px]">
          <input
            type="checkbox"
            checked={dark}
            onChange={toggleDark}
            className="h-4 w-4 cursor-pointer"
          />
          Dark mode
        </label>
      </section>

      {/* Data */}
      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Data</h3>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={exportCsv} className="cursor-pointer">
            <Download className="mr-1 h-3.5 w-3.5" /> Export CSV
          </Button>
          {!resetConfirm ? (
            <Button size="sm" variant="outline" onClick={() => setResetConfirm(true)} className="cursor-pointer">
              <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset to seed plan…
            </Button>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] text-destructive">Sure? This wipes local edits.</span>
              <Button
                size="sm"
                variant="outline"
                className="cursor-pointer text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => { reset(); setResetConfirm(false); }}
              >
                Yes, reset
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setResetConfirm(false)} className="cursor-pointer">
                Cancel
              </Button>
            </div>
          )}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Reset loads the 260-row plan from <code className="font-mono">lib/agarwood-plan.ts</code> and clears your in-progress edits. To change the plan itself, edit <code className="font-mono">data/agarwood-plan.csv</code> and run <code className="font-mono">node scripts/build-plan.mjs</code>.
        </p>
      </section>
    </div>
  );
}

function ConnRow({ ok, label, value, hint }: { ok: boolean; label: string; value: string; hint: string }) {
  const Icon = ok ? CheckCircle2 : AlertCircle;
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium">{label}</span>
        <span className={cn("chip", ok ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60" : "bg-muted text-muted-foreground ring-border")}>
          <Icon className="h-3 w-3" /> {value}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-32 shrink-0 text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="flex-1 truncate font-medium">{value}</dd>
    </div>
  );
}
