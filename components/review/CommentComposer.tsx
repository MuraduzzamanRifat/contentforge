"use client";

import { useState } from "react";
import { Send, Loader2, Languages, CheckCircle2, AlertTriangle } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { detectLang } from "@/lib/lang";
import type { Role, Decision } from "@/lib/types";

export function CommentComposer({ contentId }: { contentId: string }) {
  const viewerRole = useStore((s) => s.viewerRole);
  const setViewerRole = useStore((s) => s.setViewerRole);
  const addComment = useStore((s) => s.addComment);
  const setCommentTranslation = useStore((s) => s.setCommentTranslation);

  const [body, setBody] = useState("");
  const [decision, setDecision] = useState<Decision | "">("");
  const [posting, setPosting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const roleLabel: Record<Role, string> = { operator: "Operator (EN)", client: "Client (KO)" };

  const submit = async () => {
    const text = body.trim();
    if (!text) return;
    setErr(null);
    setPosting(true);

    const lang = detectLang(text);
    const id = addComment({
      contentId,
      role: viewerRole,
      lang,
      body: text,
      decision: decision || undefined,
    });
    setBody("");
    setDecision("");

    // Auto-translate to the other language.
    try {
      const r = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await r.json();
      if (r.ok && data.translation) {
        setCommentTranslation(contentId, id, data.translation, lang === "ko" ? "en" : "ko");
      } else if (!r.ok) {
        setErr(data.hint ?? data.error ?? "Auto-translate unavailable — comment posted untranslated.");
      }
    } catch {
      setErr("Auto-translate network error — comment posted untranslated.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="border-t border-border bg-card/60 p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
          Comment as
        </span>
        <div className="flex overflow-hidden rounded-md border border-border">
          {(["operator", "client"] as Role[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setViewerRole(r)}
              className={cn(
                "cursor-pointer px-2.5 py-1 text-[11px] font-medium transition",
                viewerRole === r
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              {roleLabel[r]}
            </button>
          ))}
        </div>
        <span className="ml-auto flex items-center gap-1 text-[10.5px] text-muted-foreground">
          <Languages className="h-3 w-3" /> auto KO↔EN
        </span>
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
        }}
        placeholder={viewerRole === "client" ? "의견을 입력하세요… (Ctrl+Enter 전송)" : "Write your comment… (Ctrl+Enter to send)"}
        rows={3}
        className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-[13px] outline-none focus:border-ring"
      />

      {err && (
        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-3 w-3" /> {err}
        </div>
      )}

      <div className="mt-2 flex items-center gap-2">
        <div className="flex overflow-hidden rounded-md border border-border text-[11px]">
          {([
            { v: "", label: "Comment" },
            { v: "approve", label: "Approve" },
            { v: "request-changes", label: "Request changes" },
          ] as { v: Decision | ""; label: string }[]).map(({ v, label }) => (
            <button
              key={label}
              type="button"
              onClick={() => setDecision(v)}
              className={cn(
                "cursor-pointer px-2.5 py-1 font-medium transition",
                decision === v
                  ? v === "approve"
                    ? "bg-emerald-600 text-white"
                    : v === "request-changes"
                    ? "bg-amber-600 text-white"
                    : "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={submit} disabled={posting || !body.trim()} className="ml-auto cursor-pointer">
          {posting ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1 h-3.5 w-3.5" />}
          {posting ? "Posting + translating…" : decision ? "Post decision" : "Post"}
        </Button>
      </div>
      {decision && (
        <p className="mt-1 flex items-center gap-1 text-[10.5px] text-muted-foreground">
          <CheckCircle2 className="h-3 w-3" />
          Posting as a {decision === "approve" ? "approval" : "change request"} — this will update the script status.
        </p>
      )}
    </div>
  );
}
