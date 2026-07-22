import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Phone QR / LAN cert — allow Next.js dev resources from this host.
  allowedDevOrigins: ["10.1.10.208"],
  experimental: {
    authInterrupts: true,
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
