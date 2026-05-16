/** YouTube video IDs are 11 chars: A–Z a–z 0–9 _ - */
const YT_ID_RE = /^[A-Za-z0-9_-]{11}$/;

export function isValidYouTubeId(s: string): boolean {
  return YT_ID_RE.test(s.trim());
}

/** Accepts a raw ID, full youtube.com/watch?v=…, youtu.be/…, or shorts URL and returns the 11-char ID. */
export function extractYouTubeId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  if (isValidYouTubeId(s)) return s;

  try {
    const url = new URL(s);
    if (url.hostname.endsWith("youtube.com")) {
      const v = url.searchParams.get("v");
      if (v && isValidYouTubeId(v)) return v;
      const parts = url.pathname.split("/").filter(Boolean);
      // /shorts/<id> or /embed/<id> or /live/<id>
      if (parts.length >= 2 && ["shorts", "embed", "live"].includes(parts[0]) && isValidYouTubeId(parts[1])) {
        return parts[1];
      }
    }
    if (url.hostname === "youtu.be") {
      const id = url.pathname.replace(/^\//, "");
      if (isValidYouTubeId(id)) return id;
    }
  } catch {
    /* not a URL */
  }
  return null;
}
