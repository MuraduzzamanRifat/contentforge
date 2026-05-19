import { describe, it, expect } from "vitest";
import {
  veoModel, veoStartUrl, veoPollUrl, buildVeoBody, parseStartResponse, parseOperation,
} from "../veo";

describe("veo config", () => {
  it("defaults the model and honors VEO_MODEL", () => {
    expect(veoModel({})).toBe("veo-3.0-fast-generate-001");
    expect(veoModel({ VEO_MODEL: "veo-x" })).toBe("veo-x");
  });
  it("builds URLs", () => {
    expect(veoStartUrl("veo-x")).toMatch(/models\/veo-x:predictLongRunning$/);
    expect(veoPollUrl("/models/x/operations/abc")).toMatch(/v1beta\/models\/x\/operations\/abc$/);
  });
  it("buildVeoBody carries the prompt and safe defaults", () => {
    const b = buildVeoBody("a wounded tree, cartoon");
    expect(b.instances[0].prompt).toContain("wounded tree");
    expect(b.parameters.aspectRatio).toBe("16:9");
  });
});

describe("parseStartResponse", () => {
  it("returns the operation name", () => {
    expect(parseStartResponse({ name: "models/x/operations/1" })).toBe("models/x/operations/1");
  });
  it("throws the API error message", () => {
    expect(() => parseStartResponse({ error: { message: "quota" } })).toThrow(/quota/);
    expect(() => parseStartResponse({})).toThrow(/no operation name/);
  });
});

describe("parseOperation", () => {
  it("not done → {done:false}", () => {
    expect(parseOperation({ done: false })).toEqual({ done: false });
    expect(parseOperation({})).toEqual({ done: false });
  });
  it("operation error → done with error", () => {
    expect(parseOperation({ done: true, error: { message: "bad" } })).toEqual({
      done: true, error: "bad",
    });
  });
  it("extracts the video URI across known shapes", () => {
    expect(
      parseOperation({
        done: true,
        response: { generateVideoResponse: { generatedSamples: [{ video: { uri: "u1" } }] } },
      }),
    ).toEqual({ done: true, videoUri: "u1" });
    expect(
      parseOperation({ done: true, response: { generatedVideos: [{ video: { uri: "u2" } }] } }),
    ).toEqual({ done: true, videoUri: "u2" });
    expect(
      parseOperation({ done: true, response: { predictions: [{ videoUri: "u3" }] } }),
    ).toEqual({ done: true, videoUri: "u3" });
  });
  it("done but no uri → honest error", () => {
    expect(parseOperation({ done: true, response: {} }).error).toMatch(/no video URI/);
  });
});
