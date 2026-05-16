# Deploying ContentForge → live URL

ContentForge is a Next.js 16 app with **server-side API routes** (`/api/ai/*`,
`/api/connections`). It needs a Node host. **GitHub Pages cannot run it**
(static-only — every AI feature would be dead). The host is **Vercel** (free
tier, native Next.js, auto-deploys from GitHub).

## Fastest path — Vercel + OpenAI key (≈2 min, recommended)

No tunnel, no Claude self-host. Always-on. The AI routes are provider-agnostic
(`lib/llm.ts`): with no Claude session present (true on Vercel serverless) and
an `OPENAI_API_KEY` set, generation uses **OpenAI** automatically.

1. https://vercel.com → **Add New… → Project** → import
   `MuraduzzamanRifat/contentforge`.
2. Framework auto-detected (Next.js). Leave defaults — the `build` script
   (`cross-env NODE_ENV=production next build`) is used as-is.
3. **Environment Variables** → add:
   - `OPENAI_API_KEY` — from <https://platform.openai.com/api-keys>. This makes
     every AI feature (script, translate, review summary, SEO) work.
   - `OPENAI_MODEL` — optional, defaults to `gpt-4o`.
   - `GEMINI_API_KEY` — optional; only for programmatic Veo (Google Flow is
     manual by default).
   - *(Skip `ANTHROPIC_API_KEY` unless you specifically want Claude-via-API.)*
   - With **no** AI key the UI/workflow still works; AI buttons return an
     honest "not connected" (HTTP 412), not a crash.
4. **Deploy.** Every future `git push` to `main` auto-deploys → stable
   `https://contentforge-*.vercel.app` URL.

That's it — Vercel's GitHub integration is the auto-deploy; no Actions secret
needed.

**Provider precedence** (`resolveProvider`, unit-tested): Claude subscription
(local self-host only) → `OPENAI_API_KEY` → `ANTHROPIC_API_KEY` → none. On
Vercel there's no Claude session, so OpenAI is used. To use your Claude
*subscription* instead (free, but needs an always-on box you control), see
[SELFHOST.md](SELFHOST.md).

## Fully GitHub-Actions-driven path (optional)

`.github/workflows/deploy.yml` deploys to Vercel from CI on every push to
`main`. It **no-ops cleanly** (never red) until you set three repo secrets:

1. In the repo locally: `npx vercel login` then `npx vercel link` →
   creates `.vercel/project.json` with `orgId` + `projectId`.
2. Token: https://vercel.com/account/tokens
3. GitHub → repo **Settings → Secrets and variables → Actions** → add:
   `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
4. Add `ANTHROPIC_API_KEY` in the Vercel project env (as above).

Push → the deploy job builds and prints the live URL in the run summary.

## Honest constraints

- The live URL **cannot be produced from this dev environment** — it requires
  your Vercel account credentials. The repo is wired so it's one connect (or
  one token) away.
- AI features on the deployed site need `ANTHROPIC_API_KEY` (serverless can't
  use the local Claude subscription). UI/workflow/data work without it.
- Board data is still `localStorage` per-browser (no shared DB yet — the
  client's GitHub-as-DB persistence is the remaining feature).
