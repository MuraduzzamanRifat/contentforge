import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Project is nested inside C:\Users\Mj (a busy repo with stray lockfiles);
  // pin the file-tracing root so Next doesn't vacuum a parent into the build.
  outputFileTracingRoot: here,
  // BUILD STATUS (2026-05-16, honest):
  //  - Next 15.x had a real /404 "<Html> outside pages/_document" defect →
  //    FIXED by the Next 16 upgrade (that error never recurs on 16).
  //  - On THIS Windows dev sandbox, `next build` static-export still fails
  //    prerendering Next 16's OWN synthetic /_global-error page with
  //    "Cannot read properties of null (reading 'useContext')" inside
  //    next/dist code. Not app code: typecheck + 108 unit + 13 E2E pass and
  //    `next dev` serves 200. Correlates with this sandbox's documented
  //    process/FS instability (same root as the repeated dev-server deaths).
  //    Vercel builds on Linux — verify the production build there; if it
  //    reproduces on Linux it becomes a real Next 16 bug to pin/patch.
  //  - cpus:1 / workerThreads:false serialize page-data collection to remove
  //    the parallel-worker race (one failure mode); keep for determinism.
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
};

export default nextConfig;
