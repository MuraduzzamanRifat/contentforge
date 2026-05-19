"use client";

import { useState } from "react";
import {
  Captions, Download, Play, Package, Loader2, X, FileText, Languages,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { scenesToSrt, scenesToVtt, type Cue } from "@/lib/subtitles";
import type { Content } from "@/lib/types";

function dl(name: string, text: string, mime = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const slug = (s: string) =>
  (s || "video").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 50);

/** ProductionState scene → subtitle cue (timecode "0:00–0:08"). */
function toCues(scenes: { timecode: string; text: string }[]): Cue[] {
  return scenes.map((s) => {
    const [start, end = ""] = s.timecode.split(/[–—-]/).map((t) => t.trim());
    return { start, end, text: s.text };
  });
}

/**
 * Voiceover-script · subtitles · sequential preview · export bundle.
 * Honest scope: emits the assets (SRT/VTT, VO script, manifest) and previews
 * the assembled clips in-browser. Final mux happens in the operator's editor /
 * YouTube — we do not fake an in-browser render.
 */
export function EditorTools({ row }: { row: Content }) {
  const scenes = row.production?.scenes ?? [];
  const cues = toCues(scenes);
  const base = slug(row.title);

  const [koBusy, setKoBusy] = useState(false);
  const [koMsg, setKoMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  const clips = scenes.filter((s) => s.clipUrl);

  async function koSrt() {
    setKoBusy(true);
    setKoMsg(null);
    try {
      const en = scenesToSrt(cues);
      const r = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: en.slice(0, 4000) }),
      });
      const j = await r.json();
      if (!r.ok) {
        setKoMsg(j.hint ? `${j.error} — ${j.hint}` : j.detail || j.error || `HTTP ${r.status}`);
        return;
      }
      dl(`${base}-ko-draft.srt`, j.translation, "application/x-subrip");
    } catch (e) {
      setKoMsg(e instanceof Error ? e.message : "Translate failed");
    } finally {
      setKoBusy(false);
    }
  }

  function exportBundle() {
    const manifest = {
      title: row.title,
      track: row.track,
      category: row.category,
      generatedAt: new Date().toISOString(),
      scenes: scenes.map((s, i) => ({
        n: i + 1, label: s.label, timecode: s.timecode,
        text: s.text, hasClip: !!s.clipUrl, status: s.status,
      })),
      onScreenText: row.production?.onScreenText ?? [],
      note: "Assemble in your editor / upload to YouTube. SRT is uploaded as captions; clips are per-scene renders.",
    };
    dl(`${base}-manifest.json`, JSON.stringify(manifest, null, 2), "application/json");
    dl(`${base}-en.srt`, scenesToSrt(cues), "application/x-subrip");
  }

  return (
    <section className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Captions className="h-3.5 w-3.5" /> Subtitles · voiceover · preview · export
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => dl(`${base}-en.srt`, scenesToSrt(cues), "application/x-subrip")}>
          <Download className="h-3.5 w-3.5" /> SRT (EN)
        </Button>
        <Button size="sm" variant="outline" onClick={() => dl(`${base}-en.vtt`, scenesToVtt(cues), "text/vtt")}>
          <Download className="h-3.5 w-3.5" /> VTT (EN)
        </Button>
        <Button size="sm" variant="outline" onClick={koSrt} disabled={koBusy}
          title="Auto KO draft via the translate model — review before uploading">
          {koBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Languages className="h-3.5 w-3.5" />}
          KO SRT (auto-draft)
        </Button>
        <Button size="sm" variant="outline"
          onClick={() => dl(`${base}-voiceover.txt`, scenes.map((s, i) => `# ${i + 1} ${s.label} (${s.timecode})\n${s.text}`).join("\n\n"))}
          title="The narration script to record voiceover from">
          <FileText className="h-3.5 w-3.5" /> VO script
        </Button>
        <Button size="sm" variant="outline" onClick={() => setPreview(true)} disabled={clips.length === 0}
          title={clips.length === 0 ? "Generate or upload at least one clip first" : "Play the assembled clips in order"}>
          <Play className="h-3.5 w-3.5" /> Preview ({clips.length}/{scenes.length})
        </Button>
        <Button size="sm" variant="outline" onClick={exportBundle}>
          <Package className="h-3.5 w-3.5" /> Export bundle
        </Button>
      </div>

      {koMsg && <p className="mt-2 text-[11px] text-red-600 dark:text-red-400">{koMsg}</p>}
      <p className="mt-2 text-[10px] text-muted-foreground">
        SRT/VTT upload to YouTube as captions (no burn-in). Final mux happens in your editor.
      </p>

      {preview && <PreviewPlayer scenes={clips} onClose={() => setPreview(false)} />}
    </section>
  );
}

function PreviewPlayer({
  scenes, onClose,
}: {
  scenes: { id: string; label: string; text: string; clipUrl?: string }[];
  onClose: () => void;
}) {
  const [i, setI] = useState(0);
  const cur = scenes[i];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="relative w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose}
          className="absolute -top-9 right-0 flex items-center gap-1 text-[12px] text-white/80 hover:text-white">
          <X className="h-4 w-4" /> Close
        </button>
        {cur?.clipUrl && (
          <video
            key={cur.id}
            src={cur.clipUrl}
            autoPlay
            controls
            onEnded={() => setI((n) => (n + 1 < scenes.length ? n + 1 : n))}
            className="w-full rounded-lg border border-border bg-black"
          />
        )}
        <div className="mt-2 rounded bg-black/60 px-3 py-2 text-center text-[13px] text-white">
          <span className="mr-2 text-white/50">{i + 1}/{scenes.length} · {cur?.label}</span>
          {cur?.text}
        </div>
        <div className="mt-2 flex justify-center gap-2">
          {scenes.map((s, n) => (
            <button key={s.id} type="button" onClick={() => setI(n)}
              className={cn("h-1.5 w-6 rounded-full", n === i ? "bg-white" : "bg-white/30")}
              aria-label={`Scene ${n + 1}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
