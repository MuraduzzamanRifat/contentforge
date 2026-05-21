/**
 * Server-side liveness check for the URLs the model emits as sources.
 *
 * Source items come in many shapes: bare URLs, "<URL> — note", or named
 * citations with no URL at all (e.g. "JSTOR — maritime trade"). We extract
 * the first http(s) URL we see, HEAD-check it with a short timeout, and
 * fall back to a tiny GET range for hosts that reject HEAD (NCBI/Wiley/etc.).
 *
 * Pure-testable parts (`extractUrl`, `checkSources` ordering with a mocked
 * fetch) are unit covered. Network I/O lives here; the route owns when to call.
 */

export interface LinkCheck {
  /** Original source string the model emitted (kept so the UI can show context). */
  source: string;
  /** Extracted URL we actually checked (or null if the source had no URL). */
  url: string | null;
  /** true = reachable · false = dead · null = no URL to check (named citation). */
  ok: boolean | null;
  status: number | null;
  reason?: string;
}

const URL_RE = /https?:\/\/[^\s)\]<>"]+/i;
const UA = "ContentForge-LinkCheck/1.0";

/** First http(s) URL in `s`, trimmed of trailing punctuation, or null. */
export function extractUrl(s: string): string | null {
  if (!s) return null;
  const m = s.match(URL_RE);
  if (!m) return null;
  return m[0].replace(/[.,;:'")\]]+$/, "");
}

/** Liveness check for one source string. */
export async function checkOne(source: string, timeoutMs = 4000): Promise<LinkCheck> {
  const url = extractUrl(source);
  if (!url) return { source, url: null, ok: null, status: null, reason: "no-url" };

  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  const headers: Record<string, string> = { "User-Agent": UA, Accept: "*/*" };

  try {
    let r = await fetch(url, { method: "HEAD", headers, redirect: "follow", signal: ctl.signal });
    // Many academic hosts (NCBI, Wiley) and CDN-fronted sites refuse HEAD with
    // 403/405/501. A tiny range-GET answers the same question without payload.
    if (r.status === 403 || r.status === 405 || r.status >= 500) {
      r = await fetch(url, {
        method: "GET",
        headers: { ...headers, Range: "bytes=0-0" },
        redirect: "follow",
        signal: ctl.signal,
      });
    }
    clearTimeout(t);
    return { source, url, ok: r.ok || r.status === 206, status: r.status };
  } catch (e) {
    clearTimeout(t);
    return {
      source,
      url,
      ok: false,
      status: null,
      reason: e instanceof Error ? e.name === "AbortError" ? "timeout" : e.message : "fetch-failed",
    };
  }
}

/**
 * Run liveness checks across `sources` with bounded concurrency. Output array
 * is aligned by index with input — the UI relies on that ordering.
 */
export async function checkSources(sources: string[], concurrency = 6): Promise<LinkCheck[]> {
  const out: LinkCheck[] = new Array(sources.length);
  let i = 0;
  const n = Math.max(1, Math.min(concurrency, sources.length || 1));
  const workers = Array.from({ length: n }, async () => {
    for (;;) {
      const idx = i++;
      if (idx >= sources.length) return;
      out[idx] = await checkOne(sources[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}
