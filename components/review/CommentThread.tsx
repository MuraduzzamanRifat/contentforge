"use client";

import { Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn, formatDate } from "@/lib/utils";
import type { ReviewComment } from "@/lib/types";

// Stable reference so the Zustand selector doesn't return a fresh [] every
// render (that triggers "getSnapshot should be cached" → infinite loop).
const EMPTY: ReviewComment[] = [];

/** Shared discussion renderer — used by ReviewBoard and the Workflow detail drawer. */
export function CommentThread({ contentId }: { contentId: string }) {
  const thread = useStore((s) => s.comments[contentId] ?? EMPTY);
  const viewerLang = useStore((s) => s.viewerLang);
  const removeComment = useStore((s) => s.removeComment);

  if (thread.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-[12px] text-muted-foreground">
        No comments yet. Start the conversation below — it auto-translates KO↔EN.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {thread.map((cm: ReviewComment) => {
        const primary = cm.lang === viewerLang ? cm.body : cm.translated;
        const secondary = cm.lang === viewerLang ? cm.translated : cm.body;
        const showingTranslated = cm.lang !== viewerLang;
        return (
          <li
            key={cm.id}
            className={cn(
              "rounded-lg border px-3 py-2",
              cm.role === "client"
                ? "border-amber-200 bg-amber-50/40 dark:border-amber-900/50 dark:bg-amber-950/20"
                : "border-border bg-card"
            )}
          >
            <div className="mb-1 flex items-center gap-2 text-[10.5px]">
              <span
                className={cn(
                  "font-semibold",
                  cm.role === "client" ? "text-amber-700 dark:text-amber-300" : "text-primary"
                )}
              >
                {cm.role === "client" ? "Client" : "Operator"}
              </span>
              <span className="text-muted-foreground">{cm.lang.toUpperCase()}</span>
              {cm.decision && (
                <span
                  className={cn(
                    "chip",
                    cm.decision === "approve"
                      ? "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
                  )}
                >
                  {cm.decision === "approve" ? "Approved" : "Changes requested"}
                </span>
              )}
              <span className="ml-auto text-muted-foreground">{formatDate(cm.createdAt)}</span>
              <button
                type="button"
                onClick={() => removeComment(cm.contentId, cm.id)}
                className="cursor-pointer text-muted-foreground/50 hover:text-destructive"
                aria-label="Delete comment"
                title="Delete comment"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{primary ?? cm.body}</p>
            {secondary && (
              <p className="mt-1.5 border-t border-border/60 pt-1.5 text-[12px] italic leading-relaxed text-muted-foreground">
                {showingTranslated ? "↳ original: " : "↳ "}
                {secondary}
              </p>
            )}
            {!cm.translated && (
              <p className="mt-1 text-[10px] text-muted-foreground/60">translating…</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
