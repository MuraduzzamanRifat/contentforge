# ContentForge — Agarwood video production dashboard

Spreadsheet-driven production tool for the 260-video agarwood YouTube channel monetized through **Daracheon / Zoell Life**. State persists to `localStorage`; backend (NestJS + Prisma + BullMQ) is designed in `prisma/schema.prisma` but not yet wired.

## Run

```bash
pnpm install
pnpm dev
# open http://localhost:3001  (port 3000 typically taken by another local app)
```

## Seed data

The 260 rows in the sheet are the operator's **real production plan** parsed from [data/agarwood-plan.csv](data/agarwood-plan.csv). 65 weeks × 4 slots (Mon/Wed/Fri/Sun) split across 4 tracks:

- **A** — Science & The Tree
- **B** — History & Trade
- **C** — Culture / Myth / Medicine
- **D** — Wildcard

To edit the plan: change the CSV, then regenerate:

```bash
node scripts/build-plan.mjs
```

`scheduledAt` is computed at build time as "next Monday from build day" + offset. Re-run the script whenever you want to roll the schedule forward.

## What works

- Inline edit on title / hook (debounced 500ms autosave)
- Status pill (8 states, color-coded)
- Track filter chips (A/B/C/D) with counts
- Tag chips (Enter / comma / backspace)
- Row ⋯ menu: Generate, Send to review, Approve, Schedule +24h, Mark published, Duplicate, Delete
- Bulk selection: To review / Approve / Delete
- Status filter + global search (`/` or `Ctrl/Cmd+K` to focus)
- Right preview panel: brief, animation direction, source list, dupe warnings, never-say guardrails, Daracheon CTA
- **Duplicate detector** — Jaccard similarity with domain stoplist; flags ≥ 30% in the sheet, surfaces top 5 in the preview
- **Real Claude script generation** via `/api/ai/script` (uses your Pro/Max subscription if Claude Code is signed in; falls back to `ANTHROPIC_API_KEY`)
- **Send to Google Flow** — formats the per-row visual prompt with the channel animation rules, copies to clipboard, opens flow.google.com in a tab
- **Mark published** — paste the YouTube ID after you upload manually
- Dark mode toggle
- Persisted to `localStorage` (key `contentforge-agarwood-v1`, version 3)

## Three channel rules enforced everywhere

1. **Factual only.** Every claim must be sourceable. `lib/project-config.ts` maps tracks to trusted source domains; Claude system prompt forces inline sourcing.
2. **No repeated topics.** `lib/dedupe.ts` runs Jaccard-on-bigrams with a domain stoplist; the preview panel surfaces conceptual overlaps before you commit.
3. **Compliant CTA = Daracheon / Zoell Life.** `NEVER_SAY` + `ALWAYS_FRAME` are pulled verbatim from the Zoell Life training PDF. The CTA block is paste-ready in every row.

Animation direction (channel-wide): cartoon-based 2D motion graphics, faceless characters allowed, on-screen content factual.

## File map

```text
app/
  layout.tsx                 — root, loads Plus Jakarta Sans + JetBrains Mono via next/font
  page.tsx                   — Sidebar + Topbar + KPI + Toolbar + Sheet + Preview shell
  globals.css                — design tokens (slate / blue-600 / orange-500)
  api/
    connections/route.ts     — GET: detect Claude/Gemini auth
    ai/script/route.ts       — POST: generate script via Claude Pro/Max or API key
components/
  shell/
    Sidebar.tsx              — nav + workspace pill + collapse
    Topbar.tsx               — breadcrumb + search + Claude status pill + theme
    ConnectionsDialog.tsx    — Claude / Google Flow / YouTube setup modal
  sheet/
    Toolbar.tsx              — track chips + status filter + bulk actions
    KpiStrip.tsx             — 5 live KPI cards
    ContentSheet.tsx         — table with duplicate flag column
    EditableCell.tsx         — debounced inline editor
    StatusCell.tsx           — dropdown pill
    TrackCell.tsx            — A/B/C/D + W##·D badge
    TagsCell.tsx             — chip input
    RowActions.tsx           — per-row menu (Generate / Approve / Mark published / …)
    PreviewPanel.tsx         — brief, animation rule, source list, dupes, CTA, generate + publish
  ui/
    button.tsx               — shadcn-style button
    dropdown.tsx             — radix-based dropdown
lib/
  agarwood-plan.ts           — AUTO-GENERATED 260-row plan + seedClone()
  store.ts                   — Zustand store (persist v3)
  types.ts                   — Content + ContentStatus + Track + style maps
  project-config.ts          — Brand, NEVER_SAY, ALWAYS_FRAME, ANIMATION, SOURCE_MAP, CTA
  dedupe.ts                  — Jaccard similarity + duplicate index builder
  flow-prompt.ts             — Google Flow / Veo prompt builder
  providers.ts               — auto-detect Claude/Gemini auth (server-only)
  utils.ts                   — cn, uid, formatters
data/
  agarwood-plan.csv          — source of truth, edit then regenerate
scripts/
  build-plan.mjs             — CSV → lib/agarwood-plan.ts
prisma/
  schema.prisma              — full backend schema (not yet wired)
```

## Connections

| Service | How |
|---|---|
| **Claude** | Run `claude` in a terminal once → Pro/Max subscription is auto-detected. Or add `ANTHROPIC_API_KEY` to `.env.local`. |
| **Google Flow / Veo** | Manual mode by default (copy prompt + open Flow tab). Add `GEMINI_API_KEY` to `.env.local` for programmatic Veo 3. |
| **YouTube** | Manual — you upload, then paste the video ID into the row. |

## Swap-in checkpoints (when backend lands)

| Now (store action) | Replace with |
|---|---|
| `patch(id, p)` | `trpc.content.update.useMutation()` with optimistic update |
| `addRow()` | `POST /projects/:id/content` |
| `/api/ai/script` (local) | `POST /ai/script` → BullMQ `GENERATE_SCRIPT` job |
| Row "Mark published" | `POST /content/:id/publish` after YouTube webhook |
| `seedClone()` | `GET /projects/:id/content` initial fetch |

The store shape was built to match the planned API.
