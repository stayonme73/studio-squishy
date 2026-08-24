import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Phone QR / LAN cert — allow Next.js dev resources from this host.
  allowedDevOrigins: ["10.1.10.208"],
  experimental: {
    authInterrupts: true,
  },
  /**
   * Netlify ___netlify-server-handler size. OpenNext copies
   * `.next/standalone` into the function archive (not the NFT file list).
   * Turbopack traces path.join(process.cwd(), dynamicRel) as the repo,
   * which pulled launch media, source, and `.netlify` cache into standalone.
   * These globs prune the server-function file trace only.
   * Public browser assets still publish as static site files.
   * Keep docs/launch/*.md (Launch Tracker reads STUDIO-MASTER-LAUNCH-LIST.md;
   * Kitchen / Room 4C still read launch package files).
   * Native sharp/libvips stay out; wasm32 remains for next/image.
   * `.netlify` must stay out of standalone — a prior packaging run left
   * 251 MB of plugins/zips that OpenNext would zip into the handler.
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
      "./src/**",
      "./scripts/**",
      "./tmp/**",
      "./tmp-tile-crops/**",
      "./test-artifacts/**",
      "./public/**",
      "./.netlify/**",
      "./node_modules/playwright/**",
      "./node_modules/playwright-core/**",
      "./node_modules/@img/sharp-libvips-*/**",
      "./node_modules/@img/sharp-linux*/**",
      "./node_modules/@img/sharp-win32*/**",
      "./node_modules/@img/sharp-darwin*/**",
      "./node_modules/next/node_modules/@img/sharp-libvips-*/**",
      "./node_modules/next/node_modules/@img/sharp-linux*/**",
      "./node_modules/next/node_modules/@img/sharp-win32*/**",
      "./node_modules/next/node_modules/@img/sharp-darwin*/**",
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
