"use client";

import { useEffect, useState } from "react";
import { X, CheckCircle2, AlertCircle, ExternalLink, Sparkles, Film, MonitorPlay } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Connections {
  claude: { available: boolean; auth: "subscription" | "api-key" | "none"; accountHint?: string };
  gemini: { available: boolean };
  googleFlow: { programmatic: boolean };
}

export function ConnectionsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [conn, setConn] = useState<Connections | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/connections", { cache: "no-store" });
      setConn(await r.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  if (!open) return null;

  const claudeStatus =
    conn?.claude.auth === "subscription" ? { label: "Connected · Pro / Max subscription", tone: "ok" as const }
    : conn?.claude.auth === "api-key" ? { label: "Connected · API key (paid)", tone: "ok" as const }
    : { label: "Not connected", tone: "warn" as const };

  const flowStatus =
    conn?.googleFlow.programmatic ? { label: "Connected · Gemini API (Veo programmatic)", tone: "ok" as const }
    : { label: "Manual mode · copy-prompt + open Flow", tone: "info" as const };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">Connections</h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-4 px-5 py-5">
          {/* Claude */}
          <Section
            icon={<Sparkles className="h-4 w-4 text-primary" />}
            title="Claude"
            subtitle="Used for: script generation, description writing, brief enrichment"
            status={claudeStatus}
          >
            <div className="space-y-2 text-[12px] text-muted-foreground">
              <p>
                Two ways to connect, tried in order:
              </p>
              <ol className="ml-4 list-decimal space-y-1.5">
                <li>
                  <strong className="text-foreground">Claude Pro / Max subscription (preferred — uses your subscription quota, not paid per call).</strong>{" "}
                  Run <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">claude</code> once in any terminal to sign into your Claude account. ContentForge auto-detects the session.
                </li>
                <li>
                  <strong className="text-foreground">ANTHROPIC_API_KEY</strong> in <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">.env.local</code>{" "}
                  (fallback, paid per call).
                </li>
              </ol>
              <a
                href="https://docs.claude.com/en/api/agent-sdk/overview"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Claude Agent SDK docs <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </Section>

          {/* Google Flow / Veo */}
          <Section
            icon={<Film className="h-4 w-4 text-orange-500" />}
            title="Google Flow / Veo"
            subtitle="Used for: cartoon video generation from the per-row visual style prompt"
            status={flowStatus}
          >
            <div className="space-y-2 text-[12px] text-muted-foreground">
              <p>
                <strong className="text-foreground">Google Flow</strong> (flow.google.com) has no public submission API yet.
                Per-row, ContentForge formats your visual prompt and you paste it into Flow with one click.
              </p>
              <p>
                For programmatic generation: add{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">GEMINI_API_KEY</code> to{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">.env.local</code> and ContentForge will use Veo 3 via the Gemini API for the same prompts.
              </p>
              <a
                href="https://ai.google.dev/gemini-api/docs/video"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Gemini Video / Veo docs <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </Section>

          {/* YouTube */}
          <Section
            icon={<MonitorPlay className="h-4 w-4 text-red-500" />}
            title="YouTube"
            subtitle="Self-managed"
            status={{ label: "Manual upload — you handle it", tone: "info" }}
          >
            <p className="text-[12px] text-muted-foreground">
              You upload to YouTube manually. Once a video is live, hit{" "}
              <strong className="text-foreground">"Mark published"</strong> on the row and paste the YouTube ID — the row flips to PUBLISHED and the analytics
              counters update.
            </p>
          </Section>
        </div>

        <footer className="flex items-center justify-between border-t border-border bg-muted/30 px-5 py-3">
          <span className="text-[11px] text-muted-foreground">
            Status is auto-detected on every open. Restart the dev server after editing{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">.env.local</code>.
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading} className="cursor-pointer">
              {loading ? "Checking…" : "Re-check"}
            </Button>
            <Button size="sm" onClick={onClose} className="cursor-pointer">Done</Button>
          </div>
        </footer>
      </div>
    </div>
  );
}

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  status: { label: string; tone: "ok" | "warn" | "info" };
  children: React.ReactNode;
}

function Section({ icon, title, subtitle, status, children }: SectionProps) {
  const toneClass =
    status.tone === "ok" ? "text-emerald-700 bg-emerald-50 ring-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:ring-emerald-900/60"
    : status.tone === "warn" ? "text-amber-700 bg-amber-50 ring-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:ring-amber-900/60"
    : "text-foreground bg-muted ring-border";
  const Indicator = status.tone === "ok" ? CheckCircle2 : AlertCircle;
  return (
    <section className="rounded-lg border border-border bg-background p-4">
      <header className="mb-2 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">{icon}</div>
          <div>
            <div className="text-[13px] font-semibold">{title}</div>
            <div className="text-[11px] text-muted-foreground">{subtitle}</div>
          </div>
        </div>
        <span className={cn("chip", toneClass)}>
          <Indicator className="h-3 w-3" />
          {status.label}
        </span>
      </header>
      {children}
    </section>
  );
}
