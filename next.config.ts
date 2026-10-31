import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Local FS campaign/task stores use path.join(process.cwd(), "data/..."). NFT tracing
  // otherwise pulls multi-GB trees into every Serverless Function on Vercel.
  // Next externalizes `sharp` by default; include native @img binaries in traced lambdas.
  outputFileTracingIncludes: {
    "/api/**": [
      "./node_modules/@img/**",
      "./node_modules/sharp/**",
      "./assets/fonts/**/*",
      "./node_modules/@sparticuz/chromium/bin/**",
      "./node_modules/@sparticuz/chromium/build/**",
      "./node_modules/playwright-core/**",
      "./node_modules/ffmpeg-static/ffmpeg",
      "./node_modules/ffmpeg-static/ffmpeg.exe",
      "./node_modules/ffprobe-static/bin/**",
    ],
  },
  outputFileTracingExcludes: {
    "/*": [
      "./data/**/*",
      "./docs/**/*",
      "./test-artifacts/**/*",
      "./tmp/**/*",
      "./tmp-*/**/*",
      "./.playwright-browsers/**/*",
      "./src/archive/**/*",
    ],
    "/api/**": [
      "./public/studio-demo/**/*",
      "./public/final-delivery-room/**/*",
      "./public/studio-board/**/*",
      "./public/welcome-hall/**/*",
      "./public/route-map/**/*",
      "./public/studio-guide/**/*",
      "./public/business-discovery-studio/**/*",
      "./public/**/*.mp4",
      "./public/**/*.webm",
      "./public/**/*@2x.png",
      "./tsconfig.tsbuildinfo",
    ],
  },
  // Bundle sharp native libs into traced functions — externalizing breaks libvips on Vercel nodejs24.
  serverExternalPackages: [
    "@napi-rs/canvas",
    "@sparticuz/chromium",
    "canvas",
    "pg",
    "playwright",
    "playwright-core",
    "stripe",
  ],
  devIndicators: false,
  // Phone LAN cert. Next.js 16 blocks /_next from unlisted hosts while HTML still paints.
  // Keep only recorded private-network IPs. If DHCP changes, add the new IP and restart.
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "10.1.10.208",
    "10.179.174.254",
    "10.126.244.254",
  ],
  experimental: {
    authInterrupts: true,
  },
  async redirects() {
    return [
      { source: "/studio-plan-review", destination: "/studio-conversation-room", permanent: false },
      { source: "/route-map", destination: "/studio-conversation-room", permanent: false },
      { source: "/project-summary", destination: "/studio-conversation-room", permanent: false },
      { source: "/project-details", destination: "/studio-conversation-room?stage=intake", permanent: false },
      { source: "/payment", destination: "/checkout", permanent: false },
      { source: "/discovery-summary", destination: "/studio-conversation-room", permanent: false },
      { source: "/studio-guide", destination: "/studio-conversation-room", permanent: false },
      { source: "/studio-guide-prototype", destination: "/studio-conversation-room", permanent: false },
      { source: "/review-room", destination: "/feedback-studio", permanent: false },
      {
        source: "/studio-tablet",
        destination: "/studio-conversation-room",
        permanent: false,
      },
      { source: "/studio", destination: "/studio-lobby", permanent: false },
    ];
  },
};

export default nextConfig;
