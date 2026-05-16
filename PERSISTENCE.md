# Shared board persistence (GitHub-as-DB)

By default ContentForge stores the board in the browser's `localStorage` —
fine for one operator, but the client opening the deployed URL sees their own
empty seed, not your data. Enabling GitHub persistence makes the **board
shared**: the collaborative slice (`rows` + `comments`) lives as a single
JSON file in a GitHub repo. Every change is a **versioned commit** — free,
auditable, revertible. (Per-user UI prefs — theme, section, language — stay
local and are *not* synced.)

## Setup (3 env vars)

1. **A repo for the data.** Recommended: a **separate private repo**, e.g.
   `MuraduzzamanRifat/contentforge-data` (keeps board commits out of the code
   repo history). A path/branch in the code repo also works.
2. **A fine-grained PAT** — github.com → Settings → Developer settings →
   Fine-grained tokens → only that repo → **Contents: Read and write**.
3. Set env (Vercel project env, or `.env.local` for self-host):

   ```dotenv
   GITHUB_TOKEN=github_pat_...
   GITHUB_BOARD_REPO=MuraduzzamanRifat/contentforge-data
   # optional:
   GITHUB_BOARD_PATH=board.json     # default
   GITHUB_BOARD_BRANCH=main         # default
   ```

Redeploy / restart. The Topbar shows a **sync pill**:
`Local only` → not configured · `Synced` (with time) → working ·
`Saving…` / `Sync error`.

## How it behaves

- **On load:** `GET /api/board`. If the file exists, **remote is the source
  of truth** — it hydrates the store (so the client sees your rows). If the
  repo is fresh, the current local board is committed to create `board.json`.
  `localStorage` remains an offline cache if GitHub is unreachable.
- **On change:** debounced ~4 s, then `PUT /api/board` → one commit. No-op /
  echo writes are skipped (no spam commits).
- **Concurrency:** optimistic via the blob `sha`. If two writers race, the
  server refetches the latest `sha` and retries once (last-write-wins for the
  later writer). For one operator + occasional client comments this is safe;
  it is **not** a CRDT — simultaneous heavy edits by both parties could drop
  one side's change. Acceptable for this workflow; documented honestly.

## Honest limits

- Whole-file model: the entire board (~150 KB at 260 rows) is committed each
  save. Simple and robust at this scale; not built for thousands of editors.
- The PAT can read/write that repo — scope it to the data repo only.
- Without the env vars nothing breaks: the app stays `Local only` exactly as
  before.
