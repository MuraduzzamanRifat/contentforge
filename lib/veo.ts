/**
 * Pure helpers for the per-scene Veo generation route (Gemini API).
 * Side-effect-free → unit tested. No fetch here; the route owns I/O.
 *
 * Flow (Google Gemini long-running video generation):
 *   POST /v1beta/models/{model}:predictLongRunning  → { name: "<operation>" }
 *   GET  /v1beta/{operation}                          → poll until done
 *   when done → a generated video URI (auth'd file) we proxy back
 *
 * Cost is real and per-clip — this route is only ever hit when the operator
 * clicks "Generate with Veo" on one scene (the hybrid choice). With no
 * GEMINI_API_KEY the route 412s and the free manual-Flow path stays the default.
 */

const API = "https://generativelanguage.googleapis.com/v1beta";

// Fast 3.0 = cheapest/quickest stable Veo (right for per-scene, cost-aware
// clicks). Override with VEO_MODEL — this key also has veo-3.1-*-preview.
export function veoModel(env: Record<string, string | undefined> = process.env): string {
  return env.VEO_MODEL || "veo-3.0-fast-generate-001";
}

export const veoStartUrl = (model: string) =>
  `${API}/models/${model}:predictLongRunning`;

export const veoPollUrl = (operationName: string) =>
  `${API}/${operationName.replace(/^\/+/, "")}`;

/** Request body for predictLongRunning. */
export function buildVeoBody(prompt: string, aspectRatio = "16:9") {
  // No personGeneration param — Veo 3 fast rejects "dont_allow"; the faceless
  // cartoon constraint is enforced in the prompt itself.
  return { instances: [{ prompt }], parameters: { aspectRatio } };
}

/** Operation name from the start response, or throw with the API message. */
export function parseStartResponse(json: unknown): string {
  const o = (json ?? {}) as Record<string, unknown>;
  if (typeof o.name === "string" && o.name) return o.name;
  const err = (o.error as { message?: string } | undefined)?.message;
  throw new Error(err || "Veo: no operation name in start response");
}

export interface VeoPoll {
  done: boolean;
  /** A fetchable video URI when done (still needs the key to download). */
  videoUri?: string;
  error?: string;
}

/** Defensive parse of the long-running operation across known shapes. */
export function parseOperation(json: unknown): VeoPoll {
  const o = (json ?? {}) as Record<string, unknown>;
  if (o.error) {
    const e = o.error as { message?: string };
    return { done: true, error: e.message || "Veo generation failed" };
  }
  if (!o.done) return { done: false };

  // Walk the likely locations for the generated video URI.
  const resp = (o.response ?? {}) as Record<string, unknown>;
  const candidates: unknown[] = [
    (resp as { generateVideoResponse?: { generatedSamples?: { video?: { uri?: string } }[] } })
      .generateVideoResponse?.generatedSamples?.[0]?.video?.uri,
    (resp as { generatedVideos?: { video?: { uri?: string } }[] }).generatedVideos?.[0]?.video?.uri,
    (resp as { predictions?: { videoUri?: string; bytesBase64Encoded?: string }[] })
      .predictions?.[0]?.videoUri,
    (resp as { video?: { uri?: string } }).video?.uri,
  ];
  const videoUri = candidates.find((c): c is string => typeof c === "string" && !!c);
  return videoUri
    ? { done: true, videoUri }
    : { done: true, error: "Veo finished but no video URI was returned" };
}
