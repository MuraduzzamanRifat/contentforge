"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { BASELINE_TAGS } from "./project-config";
import type { TopicCandidate } from "./topic-intake";
import type {
  Content, ContentPatch, ContentStatus, Track, ReviewComment, Role, Lang, SeoMeta,
  SceneStatus, SceneState, ProductionChecklist,
} from "./types";
import { uid } from "./utils";
import { parseScenes, extractAnimationDirection, extractOnScreenText } from "./scenes";

export type Section =
  | "generate" | "sheet" | "production" | "publish" | "settings";

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

  // --- Generate stage (transient — NOT persisted; remote board never carries drafts) ---
  topicCandidates: TopicCandidate[];
  genStatus: "idle" | "generating" | "error";
  genError: string | null;

  // --- GitHub-as-DB sync (transient, NOT persisted to localStorage) ---
  syncStatus: "local-only" | "loading" | "synced" | "saving" | "error";
  lastSyncedAt: string | null;
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

  // Generate stage
  setTopicCandidates: (c: TopicCandidate[]) => void;
  setGenStatus: (s: State["genStatus"], err?: string | null) => void;
  approveCandidate: (id: string) => void;   // candidate → DRAFT row in the Sheet
  rejectCandidate: (id: string) => void;    // discard candidate
  clearCandidates: () => void;

  /** Hydrate the collaborative slice from the GitHub board (remote = truth). */
  replaceBoard: (b: { rows: Content[]; comments: Record<string, ReviewComment[]> }) => void;
  setSyncStatus: (s: State["syncStatus"], at?: string) => void;


  // Stage 2 — Production (Google Flow manual)
  initProduction: (id: string) => void;            // parse scenes from approved script
  setSceneStatus: (id: string, sceneId: string, status: SceneStatus) => void;
  setSceneClip: (id: string, sceneId: string, clipUrl: string | undefined) => void;
  patchScene: (id: string, sceneId: string, p: Partial<SceneState>) => void;
  toggleProductionCheck: (id: string, key: keyof ProductionChecklist) => void;
  finalizeProduction: (id: string) => void;        // → videoApproved, eligible for Publish

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
      rows: [],                 // Sheet starts empty — it fills only with approved topics
      selectedId: null,
      selectedIds: new Set(),
      filter: "ALL",
      trackFilter: "ALL",
      search: "",
      dark: false,
      section: "generate",      // Generate is the entry point
      comments: {},
      viewerLang: "en",
      viewerRole: "operator",
      topicCandidates: [],
      genStatus: "idle",
      genError: null,
      syncStatus: "local-only",
      lastSyncedAt: null,

      setTopicCandidates: (topicCandidates) =>
        set({ topicCandidates, genStatus: "idle", genError: null }),
      setGenStatus: (genStatus, genError = null) => set({ genStatus, genError }),
      rejectCandidate: (id) =>
        set((s) => ({ topicCandidates: s.topicCandidates.filter((t) => t.id !== id) })),
      clearCandidates: () => set({ topicCandidates: [] }),
      approveCandidate: (id) => {
        const c = get().topicCandidates.find((t) => t.id === id);
        if (!c) return;
        const now = new Date().toISOString();
        const sources = c.sources.length
          ? `\n\nFACT SOURCES\n${c.sources.map((src, i) => `[${i + 1}] ${src}`).join("\n")}`
          : "";
        const row: Content = {
          id: uid(), rowIndex: 0, status: "DRAFT",
          title: c.title, hook: c.hook, script: `${c.script}${sources}`,
          description: "", category: c.category, track: c.track,
          tags: [...BASELINE_TAGS], aiCost: 0, createdAt: now, updatedAt: now,
        };
        set((s) => ({
          rows: [...s.rows, row].map((r, i) => ({ ...r, rowIndex: i })),
          topicCandidates: s.topicCandidates.filter((t) => t.id !== id),
          selectedId: row.id,
        }));
      },

      replaceBoard: (b) =>
        set({ rows: b.rows, comments: b.comments ?? {}, selectedId: null, selectedIds: new Set() }),
      setSyncStatus: (syncStatus, at) =>
        set(at !== undefined ? { syncStatus, lastSyncedAt: at } : { syncStatus }),

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

      reset: () => set({ rows: [], selectedId: null, selectedIds: new Set() }),


      initProduction: (id) =>
        set((s) => ({
          rows: s.rows.map((r) => {
            if (r.id !== id) return r;
            if (r.production) return r; // already initialised — don't clobber clips
            const parsed = parseScenes(r.script ?? "");
            return {
              ...r,
              production: {
                scenes: parsed.map((p) => ({
                  id: p.id,
                  label: p.label,
                  timecode: p.end ? `${p.start}–${p.end}` : p.start,
                  text: p.text,
                  status: "pending" as SceneStatus,
                })),
                checklist: { scenes: false, voiceover: false, subtitles: false, music: false, broll: false, finalCut: false },
                animationDirection: extractAnimationDirection(r.script ?? "") ?? undefined,
                onScreenText: extractOnScreenText(r.script ?? ""),
                finalizedAt: null,
              },
              updatedAt: new Date().toISOString(),
            };
          }),
        })),

      setSceneStatus: (id, sceneId, status) =>
        set((s) => ({
          rows: s.rows.map((r) =>
            r.id === id && r.production
              ? {
                  ...r,
                  production: {
                    ...r.production,
                    scenes: r.production.scenes.map((sc) =>
                      sc.id === sceneId ? { ...sc, status } : sc
                    ),
                  },
                }
              : r
          ),
        })),

      setSceneClip: (id, sceneId, clipUrl) =>
        set((s) => ({
          rows: s.rows.map((r) =>
            r.id === id && r.production
              ? {
                  ...r,
                  production: {
                    ...r.production,
                    scenes: r.production.scenes.map((sc) =>
                      sc.id === sceneId
                        ? { ...sc, clipUrl, status: clipUrl ? "clip-ready" : "pending" }
                        : sc
                    ),
                  },
                  updatedAt: new Date().toISOString(),
                }
              : r
          ),
        })),

      patchScene: (id, sceneId, p) =>
        set((s) => ({
          rows: s.rows.map((r) =>
            r.id === id && r.production
              ? {
                  ...r,
                  production: {
                    ...r.production,
                    scenes: r.production.scenes.map((sc) =>
                      sc.id === sceneId ? { ...sc, ...p } : sc
                    ),
                  },
                  updatedAt: new Date().toISOString(),
                }
              : r
          ),
        })),

      toggleProductionCheck: (id, key) =>
        set((s) => ({
          rows: s.rows.map((r) =>
            r.id === id && r.production
              ? {
                  ...r,
                  production: {
                    ...r.production,
                    checklist: { ...r.production.checklist, [key]: !r.production.checklist[key] },
                  },
                }
              : r
          ),
        })),

      finalizeProduction: (id) =>
        set((s) => ({
          rows: s.rows.map((r) =>
            r.id === id && r.production
              ? {
                  ...r,
                  videoApproved: true,
                  production: { ...r.production, finalizedAt: new Date().toISOString() },
                  updatedAt: new Date().toISOString(),
                }
              : r
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
      version: 7,
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
