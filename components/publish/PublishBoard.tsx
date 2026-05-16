"use client";

import { useMemo, useState } from "react";
import {
  Megaphone, Sparkles, Loader2, CheckCircle2, AlertTriangle, XCircle,
  Tag, Hash, ListOrdered, Image as ImageIcon, ShieldCheck, CalendarClock,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import { TRACK_STYLES, STATUS_STYLES, type Content, type SeoMeta } from "@/lib/types";
import { preflight, canPublish } from "@/lib/seo-preflight";
import { extractYouTubeId } from "@/lib/youtube-id";

/** Rows eligible for publishing: script approved or beyond (SEO can be drafted from the approved script). */
function isPublishable(c: Content): boolean {
  return (
    c.status === "APPROVED" ||
    c.status === "SCHEDULED" ||
    c.status === "PUBLISHED" ||
    c.videoApproved === true
  );
}

export function PublishBoard() {
  const rows = useStore((s) => s.rows);
  const selectedId = useStore((s) => s.selectedId);
  const select = useStore((s) => s.select);
  const setSeo = useStore((s) => s.setSeo);
  const setPublishPrivacy = useStore((s) => s.setPublishPrivacy);
  const schedulePublish = useStore((s) => s.schedulePublish);
  const markPublished = useStore((s) => s.markPublished);

  const list = useMemo(() => rows.filter(isPublishable), [rows]);
  const row = useMemo(() => rows.find((r) => r.id === selectedId && isPublishable(r)) ?? null, [rows, selectedId]);

  const [gen, setGen] = useState(false);
  const [genErr, setGenErr] = useState<string | null>(null);
  const [when, setWhen] = useState("");
  const [ytId, setYtId] = useState("");

  const generate = async () => {
    if (!row?.script) return;
    setGenErr(null);
    setGen(true);
    try {
      const r = await fetch("/api/ai/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: row.title, track: row.track, category: row.category, script: row.script }),
      });
      const data = await r.json();
      if (!r.ok) { setGenErr(data.hint ?? data.error ?? "SEO generation failed"); return; }
      setSeo(row.id, data.meta as SeoMeta);
    } catch (e) {
      setGenErr(e instanceof Error ? e.message : "Network error");
    } finally {
      setGen(false);
    }
  };

  const checks = row?.seo ? preflight(row.seo) : [];
  const publishable = row?.seo ? canPublish(checks) : false;

  return (
    <div className="flex h-full overflow-hidden">
      {/* List */}
      <div className="flex w-[300px] shrink-0 flex-col border-r border-border">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-[15px] font-semibold tracking-tight">Publish</h2>
          <p className="text-[11px] text-muted-foreground">SEO + metadata for approved videos</p>
        </div>
        <div className="flex-1 overflow-auto">
          {list.length === 0 && (
            <p className="p-6 text-center text-[12px] text-muted-foreground">
              Nothing to publish yet. Approve a script in Workflow first.
            </p>
          )}
          {list.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => select(r.id)}
              className={cn(
                "flex w-full cursor-pointer flex-col gap-1 border-b border-border px-3 py-2.5 text-left transition hover:bg-muted/50",
                selectedId === r.id && "bg-primary/[0.06]"
              )}
            >
              <div className="flex items-center gap-1.5">
                {r.track && <span className={cn("chip", TRACK_STYLES[r.track])}>{r.track}</span>}
                <span className={cn("chip", STATUS_STYLES[r.status])}>{r.status}</span>
                {r.seo && <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-emerald-600" aria-label="SEO ready" />}
              </div>
              <div className="line-clamp-2 text-[12.5px] font-medium leading-snug">{r.title || "Untitled"}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail */}
      {!row ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          <Megaphone className="h-6 w-6 opacity-40" />
          Select an approved video to prepare metadata.
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
            <span className={cn("chip", STATUS_STYLES[row.status])}>{row.status}</span>
            {row.track && <span className={cn("chip", TRACK_STYLES[row.track])}>{row.track}</span>}
            <span className="truncate text-[13px] font-semibold">{row.title || "Untitled"}</span>
            <Button
              size="sm"
              variant="outline"
              className="ml-auto cursor-pointer"
              disabled={!row.script || gen}
              onClick={generate}
              title={row.script ? "Generate compliant SEO from the approved script" : "No script yet"}
            >
              {gen ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1 h-3.5 w-3.5" />}
              {gen ? "Generating…" : row.seo ? "Regenerate SEO" : "Generate SEO"}
            </Button>
          </div>

          <div className="flex-1 space-y-4 overflow-auto p-4">
            {genErr && (
              <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-[12px] text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                {genErr}
              </div>
            )}

            {!row.seo && !genErr && (
              <p className="rounded-md border border-dashed border-border px-3 py-10 text-center text-[12px] text-muted-foreground">
                {row.script ? "Click Generate SEO — title, description, tags, hashtags, chapters, thumbnail concepts, all compliance-checked." : "This video has no script yet. Generate + approve it first."}
              </p>
            )}

            {row.seo && (
              <>
                {/* Preflight */}
                <section className="rounded-lg border border-border bg-card p-3">
                  <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5" /> Pre-publish checks
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {checks.map((c) => {
                      const Icon = c.level === "pass" ? CheckCircle2 : c.level === "warn" ? AlertTriangle : XCircle;
                      return (
                        <div
                          key={c.id}
                          className={cn(
                            "flex items-center gap-1 rounded px-2 py-1 text-[11px]",
                            c.level === "pass" ? "text-emerald-700 dark:text-emerald-400"
                            : c.level === "warn" ? "text-amber-700 dark:text-amber-400"
                            : "text-red-700 dark:text-red-400"
                          )}
                          title={c.detail}
                        >
                          <Icon className="h-3 w-3 shrink-0" />
                          <span className="truncate">{c.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <SeoField label="Title" icon={<Tag className="h-3 w-3" />} value={row.seo.title}
                  hint={`${row.seo.title.length}/70`}
                  onChange={(v) => setSeo(row.id, { ...row.seo!, title: v })} />

                <SeoField label="Description" icon={<Megaphone className="h-3 w-3" />} value={row.seo.description}
                  multiline onChange={(v) => setSeo(row.id, { ...row.seo!, description: v })} />

                <section>
                  <FieldLabel icon={<Tag className="h-3 w-3" />}>Tags ({row.seo.tags.length})</FieldLabel>
                  <div className="flex flex-wrap gap-1">
                    {row.seo.tags.map((t) => (
                      <span key={t} className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">{t}</span>
                    ))}
                  </div>
                </section>

                <section>
                  <FieldLabel icon={<Hash className="h-3 w-3" />}>Hashtags</FieldLabel>
                  <div className="flex flex-wrap gap-1">
                    {row.seo.hashtags.map((h) => (
                      <span key={h} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">{h}</span>
                    ))}
                  </div>
                </section>

                <section>
                  <FieldLabel icon={<ListOrdered className="h-3 w-3" />}>Chapters</FieldLabel>
                  <ul className="rounded-md border border-border bg-background">
                    {row.seo.chapters.map((c, i) => (
                      <li key={i} className="flex gap-2 border-b border-border/60 px-3 py-1.5 text-[12px] last:border-0">
                        <span className="num w-12 shrink-0 text-muted-foreground">{c.time}</span>
                        <span>{c.label}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                {row.seo.thumbnailConcepts && row.seo.thumbnailConcepts.length > 0 && (
                  <section>
                    <FieldLabel icon={<ImageIcon className="h-3 w-3" />}>Thumbnail concepts</FieldLabel>
                    <ul className="space-y-1">
                      {row.seo.thumbnailConcepts.map((t, i) => (
                        <li key={i} className="rounded-md border border-border bg-background px-3 py-1.5 text-[12px] text-foreground/85">
                          {i + 1}. {t}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}
          </div>

          {/* Publish bar */}
          {row.seo && (
            <div className="space-y-2 border-t border-border bg-muted/30 p-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="font-semibold uppercase tracking-wider text-muted-foreground">Privacy</span>
                  {(["public", "unlisted", "private"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPublishPrivacy(row.id, p)}
                      className={cn(
                        "cursor-pointer rounded px-2 py-0.5 font-medium transition",
                        (row.publishPrivacy ?? "public") === p
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-muted-foreground ring-1 ring-inset ring-border hover:text-foreground"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="datetime-local"
                    value={when}
                    onChange={(e) => setWhen(e.target.value)}
                    className="h-8 rounded-md border border-input bg-background px-2 text-[12px] outline-none focus:border-ring"
                    aria-label="Schedule date and time"
                  />
                </div>
              </div>

              {!publishable && (
                <p className="flex items-center gap-1 text-[11px] text-red-600 dark:text-red-400">
                  <XCircle className="h-3 w-3" /> Resolve the failing pre-publish checks before publishing.
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {/* Honest YouTube state: no OAuth wired yet */}
                <Button
                  size="sm"
                  className="cursor-not-allowed opacity-60"
                  disabled
                  title="YouTube publishing needs OAuth (YouTube Data API). Not connected — use 'Mark published' after uploading manually."
                >
                  <AlertTriangle className="mr-1 h-3.5 w-3.5" /> Publish via API (needs YouTube OAuth)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="cursor-pointer"
                  disabled={!publishable || !when}
                  onClick={() => schedulePublish(row.id, new Date(when).toISOString())}
                  title="Records the scheduled time locally and marks the row SCHEDULED"
                >
                  <CalendarClock className="mr-1 h-3.5 w-3.5" /> Schedule (local)
                </Button>

                <div className="ml-auto flex items-center gap-1.5">
                  <input
                    type="text"
                    value={ytId}
                    onChange={(e) => setYtId(e.target.value)}
                    placeholder="YouTube ID/URL after upload"
                    aria-label="YouTube ID or URL"
                    className="h-8 w-44 rounded-md border border-input bg-background px-2 text-[12px] outline-none focus:border-ring"
                  />
                  <Button
                    size="sm"
                    className="cursor-pointer"
                    disabled={!publishable || !extractYouTubeId(ytId)}
                    onClick={() => {
                      const id = extractYouTubeId(ytId);
                      if (!id) return;
                      markPublished(row.id, id);
                      setYtId("");
                    }}
                    title="You uploaded manually — record it as published"
                  >
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Mark published
                  </Button>
                </div>
              </div>
              {row.status === "PUBLISHED" && row.youtubeId && (
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  Published {formatDate(row.publishedAt)} · youtu.be/{row.youtubeId}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FieldLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {icon} {children}
    </div>
  );
}

function SeoField({
  label, icon, value, hint, multiline, onChange,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  hint?: string;
  multiline?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <section>
      <div className="mb-1 flex items-center justify-between">
        <FieldLabel icon={icon}>{label}</FieldLabel>
        {hint && <span className="num text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[8rem] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-[12px] leading-relaxed outline-none focus:border-ring"
          aria-label={label}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] outline-none focus:border-ring"
          aria-label={label}
        />
      )}
    </section>
  );
}
