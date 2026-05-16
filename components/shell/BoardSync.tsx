"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";

/**
 * Headless: keeps the collaborative board ({rows, comments}) in sync with the
 * GitHub-as-DB file so every viewer (operator + client) sees the same data.
 *
 * Flow:
 *  - mount → GET /api/board
 *      200 + data   → remote is source of truth; hydrate the store
 *      200 + null    → fresh repo; push current local board to create the file
 *      412           → not configured; stay local-only (localStorage only)
 *  - store rows/comments change → debounced PUT (skips no-op/echo commits)
 *
 * Per-user UI prefs (dark/section/viewerLang/Role) are intentionally NOT synced.
 */
export function BoardSync() {
  const setSyncStatus = useStore((s) => s.setSyncStatus);
  const replaceBoard = useStore((s) => s.replaceBoard);

  const shaRef = useRef<string | null>(null);
  const lastJsonRef = useRef<string | null>(null);
  const loadedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Load on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSyncStatus("loading");
      try {
        const r = await fetch("/api/board", { cache: "no-store" });
        if (cancelled) return;
        if (r.status === 412) {
          setSyncStatus("local-only");
          loadedRef.current = true;
          return;
        }
        const j = await r.json();
        if (!r.ok) {
          setSyncStatus("error");
          loadedRef.current = true;
          return;
        }
        shaRef.current = j.sha ?? null;
        if (j.data && Array.isArray(j.data.rows)) {
          replaceBoard({ rows: j.data.rows, comments: j.data.comments ?? {} });
          lastJsonRef.current = JSON.stringify({ rows: j.data.rows, comments: j.data.comments ?? {} });
          setSyncStatus("synced", new Date().toISOString());
          loadedRef.current = true;
        } else {
          // Fresh repo — create the file from the current local board.
          loadedRef.current = true;
          await pushNow("create board.json");
        }
      } catch {
        if (!cancelled) {
          setSyncStatus("error");
          loadedRef.current = true;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Debounced push on collaborative-state change
  useEffect(() => {
    const unsub = useStore.subscribe((s, prev) => {
      if (!loadedRef.current) return;
      if (s.syncStatus === "local-only") return;
      if (s.rows === prev.rows && s.comments === prev.comments) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void pushNow("update"), 4000);
    });
    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pushNow(reason: string) {
    const s = useStore.getState();
    if (s.syncStatus === "local-only") return;
    const board = { rows: s.rows, comments: s.comments };
    const json = JSON.stringify(board);
    if (json === lastJsonRef.current) return; // no-op / echo guard
    setSyncStatus("saving");
    try {
      const r = await fetch("/api/board", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board, sha: shaRef.current, by: s.viewerRole }),
      });
      const j = await r.json();
      if (!r.ok) {
        setSyncStatus("error");
        return;
      }
      shaRef.current = j.sha ?? shaRef.current;
      lastJsonRef.current = json;
      setSyncStatus("synced", new Date().toISOString());
    } catch {
      setSyncStatus("error");
    }
    void reason;
  }

  return null;
}
