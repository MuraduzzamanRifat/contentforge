# Self-host ContentForge with a live URL — using your Claude subscription ($0 API)

This serves the **full app** (all AI features) on a public URL while billing
generation to your **Claude Pro/Max subscription**, not the paid API. It works
because ContentForge runs as a long-running Node server that drives Claude Code
via a headless subscription token.

Run this on a machine that stays on (your PC, or a small VPS).

---

## One-time: mint a headless subscription token

On the host machine, with Claude Code installed:

```bash
claude setup-token
```

This prints a long-lived **`CLAUDE_CODE_OAUTH_TOKEN`** tied to your Pro/Max
subscription. Copy it. (It does not expire like the interactive session; it's
the sanctioned headless/automation credential — no API key, no per-token cost.)

Put it where the server will read it — create `.env.local` in the repo:

```dotenv
CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-...
```

ContentForge’s `resolveClaudeAuth()` treats this as **subscription** auth
(highest priority) — verified by unit tests.

---

## Run the server

```bash
pnpm install
pnpm serve          # = pnpm build && pnpm start  → http://localhost:3000
```

Leave it running. (`pnpm serve` builds then starts the production server.)

Sanity check in another terminal:

```bash
curl -s localhost:3000/api/connections
# → {"claude":{"available":true,"auth":"subscription"}, ...}
```

`"auth":"subscription"` means generation will use your subscription.

---

## Expose it with a tunnel (free public URL)

### Option A — Cloudflare Tunnel (recommended: free, no account, stable)

```bash
# install once (Windows): winget install --id Cloudflare.cloudflared
cloudflared tunnel --url http://localhost:3000
```

It prints a public URL like `https://random-words.trycloudflare.com`. That is
your live URL. (For a *stable* custom domain instead of a random one, set up a
named tunnel: `cloudflared tunnel login` → `cloudflared tunnel create
contentforge` → route DNS → `cloudflared tunnel run contentforge`.)

### Option B — ngrok (already installed on this machine)

```bash
ngrok config add-authtoken <token-from-dashboard.ngrok.com>   # one-time
ngrok http 3000
```

Prints `https://<id>.ngrok-free.app` — your live URL.

---

## Keep it alive across reboots (optional, for "always-on")

- **Windows:** run `pnpm serve` + the tunnel under
  [NSSM](https://nssm.cc/) or Task Scheduler (at logon, restart on failure).
- **Linux VPS:** `pm2 start "pnpm serve" --name contentforge` and
  `pm2 start "cloudflared tunnel run contentforge" --name cf` then
  `pm2 save && pm2 startup`.

---

## ⚠️ Protect the URL — it spends YOUR subscription

A public tunnel URL is unauthenticated. The `/api/ai/*` routes run Claude on
**your subscription**, so anyone who gets the link can burn your quota. Before
sharing, put access control in front:

- **Cloudflare Access (best, free):** use a *named* tunnel (not the random
  quick tunnel), then add an Access policy in the Cloudflare Zero Trust
  dashboard — email-OTP or Google login, allow only you + the client's email.
- **Or basic auth:** front the server with a tiny reverse proxy (Caddy:
  `basicauth { user <bcrypt-hash> }`) or Cloudflare Access — never expose the
  bare quick tunnel for real use.
- The random `*.trycloudflare.com` quick tunnel is for **testing only** — it's
  open to anyone who learns the hostname.

Verified working (curl through a live public tunnel): `/` → 200,
`/api/connections` → `"auth":"subscription"`. The tunnel was then torn down —
do not run an unauthenticated public tunnel to credentialed routes.

## What the client gets

Share the tunnel URL. They open the **Workflow** board, read the Korean
summary, comment (auto-translated), approve/reject. Every Claude call —
script gen, translation, SEO — runs on **your** subscription. No API bill.

Caveat: board data is still per-browser `localStorage` (no shared DB yet).
For the client to see your rows, that needs the GitHub-as-DB persistence
(the remaining feature). Until then this is the single-operator view + a
shareable live instance.
