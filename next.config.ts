import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Phone QR / LAN cert — allow Next.js dev resources from this host.
  allowedDevOrigins: ["10.1.10.208"],
  experimental: {
    authInterrupts: true,
  },
  /**
   * Netlify ___netlify-server-handler size. Turbopack traces
   * path.join(process.cwd(), dynamicRel) as the whole repo, which pulled
   * ~1.4 GB of launch media into the serverless function (250 MB unzipped
   * limit). These globs only prune the server-function file trace.
   * Public browser assets still publish as static site files.
   * Keep docs/launch/*.md (Launch Tracker reads STUDIO-MASTER-LAUNCH-LIST.md).
   * Use anchored ./dir/** patterns — bare "docs" can match unrelated paths.
   */
  outputFileTracingExcludes: {
    "/*": [
      "./docs/launch/**/*.mp4",
      "./docs/launch/**/*.webm",
      "./docs/launch/**/*.mp3",
      "./docs/launch/**/*.wav",
      "./docs/launch/**/*.png",
      "./docs/launch/**/*.jpg",
      "./docs/launch/**/*.jpeg",
      "./docs/launch/**/*.webp",
      "./docs/launch/**/*.gif",
      "./docs/launch/**/*.pdf",
      "./docs/launch/**/*.html",
      "./docs/launch/**/*.svg",
      "./docs/illustration/**",
      "./docs/review-captures/**",
      "./src/archive/**",
      "./scripts/**",
      "./tmp/**",
      "./tmp-tile-crops/**",
      "./test-artifacts/**",
      "./public/**",
      "./node_modules/playwright/**",
      "./node_modules/playwright-core/**",
      "./.env.local",
      "./tsconfig.tsbuildinfo",
    ],
  },
  async redirects() {
    return [
      { source: "/studio-plan-review", destination: "/studio-conversation-room", permanent: false },
      { source: "/route-map", destination: "/studio-conversation-room", permanent: false },
      { source: "/project-builder", destination: "/studio-conversation-room", permanent: false },
      { source: "/project-summary", destination: "/studio-conversation-room", permanent: false },
      { source: "/project-details", destination: "/studio-conversation-room?stage=intake", permanent: false },
      { source: "/checkout", destination: "/studio-conversation-room?stage=checkout", permanent: false },
      { source: "/payment", destination: "/studio-conversation-room?stage=checkout", permanent: false },
      { source: "/discovery-summary", destination: "/studio-conversation-room", permanent: false },
      { source: "/studio-guide", destination: "/studio-conversation-room", permanent: false },
      { source: "/studio-guide-prototype", destination: "/studio-conversation-room", permanent: false },
      { source: "/review-room", destination: "/feedback-studio", permanent: false },
      {
        source: "/studio-tablet",
        destination: "/studio-conversation-room",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
