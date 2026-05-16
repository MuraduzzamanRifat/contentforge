# Deploying ContentForge → live URL

ContentForge is a Next.js 16 app with **server-side API routes** (`/api/ai/*`,
`/api/connections`). It needs a Node host. **GitHub Pages cannot run it**
(static-only — every AI feature would be dead). The host is **Vercel** (free
tier, native Next.js, auto-deploys from GitHub).

## Fastest path — connect the repo in Vercel (≈2 min, one-time)

1. https://vercel.com → **Add New… → Project** → import
   `MuraduzzamanRifat/contentforge`.
2. Framework is auto-detected (Next.js). Leave build/output defaults — the
   `build` script (`cross-env NODE_ENV=production next build`) is used as-is.
3. **Environment Variables** → add:
   - `ANTHROPIC_API_KEY` — required for the AI routes. The Claude *subscription*
     path (Agent SDK spawning the `claude` binary) **cannot run on serverless**;
     on Vercel the routes use the API key. Without it the whole UI still works
     and AI buttons return an honest "not connected" (HTTP 412), not a crash.
   - `GEMINI_API_KEY` — optional; only if you later wire programmatic Veo
     (current Google Flow path is manual, no key needed).
4. **Deploy.** Every future `git push` to `main` auto-deploys and you get a
   stable `https://contentforge-*.vercel.app` URL.

That's it — Vercel's GitHub integration is the auto-deploy; no Actions secret
needed for this path.

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
