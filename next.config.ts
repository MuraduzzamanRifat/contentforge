import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The project is nested inside C:\Users\Mj (a busy repo with stray lockfiles
  // and node_modules). Pin the file-tracing root to THIS project so Next does
  // not vacuum a parent pages/_document into the build (cause of the /404
  // "<Html> should not be imported outside pages/_document" prerender error).
  outputFileTracingRoot: here,
  // KNOWN ISSUE: `next build` fails prerendering the synthetic /404 with
  // "<Html> should not be imported outside pages/_document" on this Next 15.x
  // line (App Router + __barrel_optimize__ pulling the pages _error runtime).
  // No app code imports next/document. Does NOT affect `next dev` or runtime.
  // Deployment is deferred; revisit when bumping to Next 16 or when the
  // upstream fix lands. Tracked against the build, not the workflow feature.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
};

export default nextConfig;
