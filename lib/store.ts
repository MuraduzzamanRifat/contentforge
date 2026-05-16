"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { seedClone } from "./agarwood-plan";
import type { Content, ContentPatch, ContentStatus, Track, ReviewComment, Role, Lang, SeoMeta } from "./types";
import { uid } from "./utils";

export type Section = "workflow" | "sheet" | "review" | "publish" | "calendar" | "analytics" | "library" | "settings";

interface State {
  rows: Content[];
  selectedId: string | null;
  selectedIds: Set<string>;
  filter: ContentStatus | "ALL";
  trackFilter: Track | "ALL";
  search: string;
  dark: boolean;
  section: Section;
  /** Discussion threads keyed by content id. */
  comments: Record<string, ReviewComment[]>;
  /** Which language the board surfaces prominently for the current viewer. */
  viewerLang: Lang;
  /** Which side of the conversation "you" are when composing. */
  viewerRole: Role;
}

interface Actions {
  select: (id: string | null) => void;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  setFilter: (f: ContentStatus | "ALL") => void;
  setTrackFilter: (t: Track | "ALL") => void;
  setSearch: (q: string) => void;
  toggleDark: () => void;
  setSection: (s: Section) => void;

  patch: (id: string, p: ContentPatch) => void;
  addRow: (after?: string) => string;
  duplicate: (id: string) => void;
  remove: (id: string) => void;
  bulkPatch: (ids: string[], p: ContentPatch) => void;
  bulkRemove: (ids: string[]) => void;
  reset: () => void;

  // Workflow stage transitions
  sendToReview: (id: string) => void;
  approveScript: (id: string) => void;
  rejectScript: (id: string) => void;
  reopenScript: (id: string) => void;       // Rejected/anything → back to Draft
  lockForProduction: (id: string) => void;  // Approved → Ready
  unlockProduction: (id: string) => void;

  // Stage 3 — Publish
  setSeo: (id: string, seo: SeoMeta) => void;
  setPublishPrivacy: (id: string, p: "public" | "unlisted" | "private") => void;
  schedulePublish: (id: string, isoWhen: string | null) => void;
  markPublished: (id: string, youtubeId: string) => void;

  setViewerLang: (l: Lang) => void;
  setViewerRole: (r: Role) => void;
  addComment: (c: Omit<ReviewComment, "id" | "createdAt">) => string;
  setCommentTranslation: (contentId: string, commentId: string, translated: string, translatedLang: Lang) => void;
  removeComment: (contentId: string, commentId: string) => void;
}

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      rows: seedClone(),
      selectedId: null,
      selectedIds: new Set(),
      filter: "ALL",
      trackFilter: "ALL",
      search: "",
      dark: false,
      section: "sheet",
      comments: {},
      viewerLang: "en",
      viewerRole: "operator",

      select: (id) => set({ selectedId: id }),
      toggleSelect: (id) =>
        set((s) => {
          const next = new Set(s.selectedIds);
          next.has(id) ? next.delete(id) : next.add(id);
          return { selectedIds: next };
        }),
      clearSelection: () => set({ selectedIds: new Set() }),
      setFilter: (filter) => set({ filter }),
      setTrackFilter: (trackFilter) => set({ trackFilter }),
      setSearch: (search) => set({ search }),
      toggleDark: () =>
        set((s) => {
          const dark = !s.dark;
          if (typeof document !== "undefined")
            document.documentElement.classList.toggle("dark", dark);
          return { dark };
        }),
      setSection: (section) => set({ section }),

      patch: (id, p) =>
        set((s) => ({
          rows: s.rows.map((r) =>
            r.id === id ? { ...r, ...p, updatedAt: new Date().toISOString() } : r
          ),
        })),

      addRow: (after) => {
        const id = uid();
        set((s) => {
          const idx = after ? s.rows.findIndex((r) => r.id === after) + 1 : s.rows.length;
          const fresh: Content = {
            id, rowIndex: idx, status: "IDEA",
            title: "", hook: "", script: "", description: "",
            tags: [], aiCost: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          const rows = [...s.rows.slice(0, idx), fresh, ...s.rows.slice(idx)]
            .map((r, i) => ({ ...r, rowIndex: i }));
          return { rows, selectedId: id };
        });
        return id;
      },

      duplicate: (id) => {
        const src = get().rows.find((r) => r.id === id);
        if (!src) return;
        const newId = uid();
        set((s) => {
          const idx = s.rows.findIndex((r) => r.id === id) + 1;
          const copy: Content = {
            ...src, id: newId,
            title: `${src.title || "Untitled"} (copy)`,
            status: "DRAFT",
            youtubeId: undefined, publishedAt: null, scheduledAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          const rows = [...s.rows.slice(0, idx), copy, ...s.rows.slice(idx)]
            .map((r, i) => ({ ...r, rowIndex: i }));
          return { rows, selectedId: newId };
        });
      },

      remove: (id) =>
        set((s) => ({
          rows: s.rows.filter((r) => r.id !== id).map((r, i) => ({ ...r, rowIndex: i })),
          selectedId: s.selectedId === id ? null : s.selectedId,
        })),

      bulkPatch: (ids, p) =>
        set((s) => {
          const set_ = new Set(ids);
          return {
            rows: s.rows.map((r) =>
              set_.has(r.id) ? { ...r, ...p, updatedAt: new Date().toISOString() } : r
            ),
          };
        }),

      bulkRemove: (ids) =>
        set((s) => {
          const set_ = new Set(ids);
          return {
            rows: s.rows.filter((r) => !set_.has(r.id)).map((r, i) => ({ ...r, rowIndex: i })),
            selectedIds: new Set(),
          };
        }),

      reset: () => set({ rows: seedClone(), selectedId: null, selectedIds: new Set() }),

      sendToReview: (id) =>
        set((s) => ({
          rows: s.rows.map((r) =>
            r.id === id ? { ...r, status: "REVIEW", rejected: false, updatedAt: new Date().toISOString() } : r
          ),
        })),
      approveScript: (id) =>
        set((s) => ({
          rows: s.rows.map((r) =>
            r.id === id
              ? { ...r, status: "APPROVED", rejected: false, productionLocked: false, updatedAt: new Date().toISOString() }
              : r
          ),
        })),
      rejectScript: (id) =>
        set((s) => ({
          rows: s.rows.map((r) =>
            r.id === id ? { ...r, status: "DRAFT", rejected: true, updatedAt: new Date().toISOString() } : r
          ),
        })),
      reopenScript: (id) =>
        set((s) => ({
          rows: s.rows.map((r) =>
            r.id === id
              ? { ...r, status: "DRAFT", rejected: false, productionLocked: false, updatedAt: new Date().toISOString() }
              : r
          ),
        })),
      lockForProduction: (id) =>
        set((s) => ({
          rows: s.rows.map((r) =>
            r.id === id ? { ...r, status: "APPROVED", productionLocked: true, updatedAt: new Date().toISOString() } : r
          ),
        })),
      unlockProduction: (id) =>
        set((s) => ({
          rows: s.rows.map((r) =>
            r.id === id ? { ...r, productionLocked: false, updatedAt: new Date().toISOString() } : r
          ),
        })),

      setSeo: (id, seo) =>
        set((s) => ({
          rows: s.rows.map((r) =>
            r.id === id
              ? { ...r, seo: { ...seo, generatedAt: new Date().toISOString() }, updatedAt: new Date().toISOString() }
              : r
          ),
        })),
      setPublishPrivacy: (id, publishPrivacy) =>
        set((s) => ({
          rows: s.rows.map((r) => (r.id === id ? { ...r, publishPrivacy } : r)),
        })),
      schedulePublish: (id, isoWhen) =>
        set((s) => ({
          rows: s.rows.map((r) =>
            r.id === id
              ? {
                  ...r,
                  publishAt: isoWhen,
                  status: isoWhen ? "SCHEDULED" : r.status,
                  scheduledAt: isoWhen ?? r.scheduledAt,
                  updatedAt: new Date().toISOString(),
                }
              : r
          ),
        })),
      markPublished: (id, youtubeId) =>
        set((s) => ({
          rows: s.rows.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: "PUBLISHED",
                  youtubeId,
                  publishedAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }
              : r
          ),
        })),

      setViewerLang: (viewerLang) => set({ viewerLang }),
      setViewerRole: (viewerRole) => set({ viewerRole }),

      addComment: (c) => {
        const id = uid("cm");
        set((s) => {
          const list = s.comments[c.contentId] ?? [];
          return {
            comments: {
              ...s.comments,
              [c.contentId]: [...list, { ...c, id, createdAt: new Date().toISOString() }],
            },
          };
        });
        return id;
      },

      setCommentTranslation: (contentId, commentId, translated, translatedLang) =>
        set((s) => {
          const list = s.comments[contentId];
          if (!list) return s;
          return {
            comments: {
              ...s.comments,
              [contentId]: list.map((cm) =>
                cm.id === commentId ? { ...cm, translated, translatedLang } : cm
              ),
            },
          };
        }),

      removeComment: (contentId, commentId) =>
        set((s) => {
          const list = s.comments[contentId];
          if (!list) return s;
          return {
            comments: { ...s.comments, [contentId]: list.filter((cm) => cm.id !== commentId) },
          };
        }),
    }),
    {
      name: "contentforge-agarwood-v1",
      version: 6,
      partialize: (s) => ({
        rows: s.rows,
        dark: s.dark,
        section: s.section,
        comments: s.comments,
        viewerLang: s.viewerLang,
        viewerRole: s.viewerRole,
      }),
    }
  )
);
