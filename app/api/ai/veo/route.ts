import { NextRequest, NextResponse } from "next/server";
import {
  veoModel, veoStartUrl, veoPollUrl, buildVeoBody, parseStartResponse, parseOperation,
} from "@/lib/veo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function key(): string | null {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || null;
}
const noKey = () =>
  NextResponse.json(
    {
      error: "Veo not configured",
      hint: "Per-scene Veo generation needs GEMINI_API_KEY in the Vercel env (paid, per-clip). Without it, the free manual Flow path still works.",
    },
    { status: 412 },
  );
const H = (k: string) => ({ "x-goog-api-key": k });

/** Map a raw Google error to an actionable hint. */
function hintFor(msg: string): string | undefined {
  if (/quota|billing|exceeded your current/i.test(msg))
    return "Veo is a PAID model — the Gemini key's Google Cloud project has no Veo quota. Enable billing for the project (or use VEO_MODEL with a model your plan covers). The free manual-Flow path still works meanwhile.";
  if (/not found|not supported|ListModels/i.test(msg))
    return "Set VEO_MODEL to a model this key has (e.g. veo-3.0-fast-generate-001 / veo-3.1-fast-generate-preview).";
  if (/API key|permission|PERMISSION_DENIED|invalid/i.test(msg))
    return "GEMINI_API_KEY is invalid or lacks Veo access — regenerate it and update the Vercel env.";
  return undefined;
}

/** Start a generation for ONE scene prompt (spends money — click-only). */
export async function POST(req: NextRequest) {
  const k = key();
  if (!k) return noKey();
  let body: { prompt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.prompt?.trim()) {
    return NextResponse.json({ error: "prompt required" }, { status: 400 });
  }
  try {
    const r = await fetch(veoStartUrl(veoModel()), {
      method: "POST",
      headers: { ...H(k), "Content-Type": "application/json" },
      body: JSON.stringify(buildVeoBody(body.prompt)),
    });
    const j = await r.json();
    if (!r.ok) {
      const detail = (j?.error?.message as string) || `HTTP ${r.status}`;
      return NextResponse.json({ error: "Veo start failed", detail, hint: hintFor(detail) }, { status: 502 });
    }
    return NextResponse.json({ operation: parseStartResponse(j) });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Veo start failed", detail, hint: hintFor(detail) }, { status: 500 });
  }
}

/** GET ?op=<operation> → poll status. GET ?file=<uri> → key-proxied stream. */
export async function GET(req: NextRequest) {
  const k = key();
  if (!k) return noKey();
  const { searchParams } = new URL(req.url);

  const file = searchParams.get("file");
  if (file) {
    try {
      const r = await fetch(file, { headers: H(k) });
      if (!r.ok || !r.body) {
        return NextResponse.json({ error: `Video fetch failed (${r.status})` }, { status: 502 });
      }
      return new NextResponse(r.body, {
        headers: {
          "Content-Type": r.headers.get("content-type") || "video/mp4",
          "Cache-Control": "private, max-age=3600",
        },
      });
    } catch (e) {
      return NextResponse.json(
        { error: "Video proxy failed", detail: e instanceof Error ? e.message : String(e) },
        { status: 500 },
      );
    }
  }

  const op = searchParams.get("op");
  if (!op) return NextResponse.json({ error: "op or file required" }, { status: 400 });
  try {
    const r = await fetch(veoPollUrl(op), { headers: H(k) });
    const j = await r.json();
    if (!r.ok) {
      const detail = (j?.error?.message as string) || `HTTP ${r.status}`;
      return NextResponse.json({ error: "Veo poll failed", detail, hint: hintFor(detail) }, { status: 502 });
    }
    return NextResponse.json(parseOperation(j));
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Veo poll failed", detail, hint: hintFor(detail) }, { status: 500 });
  }
}
