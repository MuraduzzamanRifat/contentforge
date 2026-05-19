export const STATUSES = ["IDEA", "DRAFT", "REVIEW", "APPROVED", "SCHEDULED", "PUBLISHING", "PUBLISHED", "FAILED"] as const;
export type ContentStatus = typeof STATUSES[number];

export const STATUS_STYLES: Record<ContentStatus, string> = {
  IDEA:       "bg-zinc-100 text-zinc-700 ring-zinc-200",
  DRAFT:      "bg-blue-100 text-blue-700 ring-blue-200",
  REVIEW:     "bg-amber-100 text-amber-800 ring-amber-200",
  APPROVED:   "bg-emerald-100 text-emerald-700 ring-emerald-200",
  SCHEDULED:  "bg-violet-100 text-violet-700 ring-violet-200",
  PUBLISHING: "bg-sky-100 text-sky-700 ring-sky-200 animate-pulse",
  PUBLISHED:  "bg-green-100 text-green-700 ring-green-200",
  FAILED:     "bg-red-100 text-red-700 ring-red-200",
};

export type Track = "A" | "B" | "C" | "D";

export const TRACK_STYLES: Record<Track, string> = {
  A: "bg-sky-100 text-sky-700 ring-sky-200",       // Science & The Tree
  B: "bg-amber-100 text-amber-800 ring-amber-200", // History & Trade
  C: "bg-emerald-100 text-emerald-700 ring-emerald-200", // Culture / Myth / Medicine
  D: "bg-violet-100 text-violet-700 ring-violet-200",    // Wildcard
};

export const TRACK_LABELS: Record<Track, string> = {
  A: "Science",
  B: "History",
  C: "Culture",
  D: "Wildcard",
};

export interface Content {
  id: string;
  rowIndex: number;
  status: ContentStatus;
  title: string;
  hook: string;
  script: string;
  description: string;
  brief?: string;
  track?: Track | null;
  trackName?: string;
  category?: string;
  visualStyle?: string;
  weekIndex?: number;
  publishSlot?: "Mon" | "Wed" | "Fri" | "Sun";
  tags: string[];
  thumbnailUrl?: string;
  videoUrl?: string;
  youtubeId?: string;
  scheduledAt?: string | null;
  publishedAt?: string | null;
  aiCost: number;
  createdAt: string;
  updatedAt: string;
  // Workflow pipeline
  rejected?: boolean;          // client requested changes — sits in Rejected column
  productionLocked?: boolean;  // operator locked the approved script → Ready for Production
  videoApproved?: boolean;     // final cut approved → eligible for Publish stage
  // Stage 2 — Production (Google Flow manual)
  production?: ProductionState;
  // Stage 3 — Publish
  seo?: SeoMeta;
  publishPrivacy?: "public" | "unlisted" | "private";
  publishAt?: string | null;   // ISO; set when scheduled
}

export type SceneStatus = "pending" | "prompt-copied" | "generating" | "clip-ready";

export interface SceneState {
  id: string;
  label: string;
  timecode: string;   // "0:00–0:08"
  text: string;
  status: SceneStatus;
  clipUrl?: string;   // manual object URL OR the Veo-proxied video URL
  veoOp?: string;     // in-flight Veo long-running operation name
  note?: string;
}

export interface ProductionChecklist {
  scenes: boolean;
  voiceover: boolean;
  subtitles: boolean;
  music: boolean;
  broll: boolean;
  finalCut: boolean;
}

export interface ProductionState {
  scenes: SceneState[];
  checklist: ProductionChecklist;
  animationDirection?: string;
  onScreenText: string[];
  finalizedAt?: string | null;
}

export interface SeoMeta {
  title: string;
  description: string;
  tags: string[];
  hashtags: string[];
  chapters: { time: string; label: string }[];
  thumbnailConcepts?: string[];
  categoryId?: string;
  complianceNote?: string;
  generatedAt?: string;
}

export type ContentPatch = Partial<Omit<Content, "id" | "rowIndex" | "createdAt">>;

// ---- Bilingual script-review board ----

export type Role = "operator" | "client";
export type Lang = "en" | "ko";
export type Decision = "approve" | "request-changes";

export interface ReviewComment {
  id: string;
  contentId: string;
  role: Role;            // who wrote it
  lang: Lang;            // language they wrote in (auto-detected client-side, refined server-side)
  body: string;          // original text
  translated?: string;   // the other-language rendering (filled by /api/ai/translate)
  translatedLang?: Lang;
  decision?: Decision;   // set when the comment is also a decision
  createdAt: string;
}

