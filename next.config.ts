import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Project is nested inside C:\Users\Mj (a busy repo with stray lockfiles);
  // pin the file-tracing root so Next doesn't vacuum a parent into the build.
  outputFileTracingRoot: here,
  // Two real, distinct build issues on this Windows sandbox (both fixed):
  //  1. The "<Html> outside pages/_document" / "useContext null" prerender
  //     crashes were NOT a Next framework bug — the shell exports
  //     NODE_ENV=development globally, breaking `next build`'s React
  //     prod/dev runtime. Fixed by `cross-env NODE_ENV=production` in the
  //     build/start scripts (package.json) — correct regardless of shell env.
  //  2. Next's default parallel page-data collection ("using 7 workers")
  //     races on this sandbox's filesystem → intermittent
  //     "PageNotFoundError: Cannot find module for page". Serializing to one
  //     worker makes it deterministic. (Confirmed: removing this re-breaks
  //     the build immediately; slower build, identical output.)
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
