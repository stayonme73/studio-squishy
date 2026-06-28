import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    authInterrupts: true,
  },
  async redirects() {
    return [
      { source: "/project-discovery", destination: "/business-discovery-studio", permanent: false },
      { source: "/business_discovery_studio", destination: "/business-discovery-studio", permanent: false },
      { source: "/draft-room/begin", destination: "/business-discovery-studio", permanent: false },
      { source: "/draft-room", destination: "/business-discovery-studio", permanent: false },
      { source: "/intake", destination: "/business-discovery-studio", permanent: false },
      { source: "/studio-plan-review", destination: "/project-summary", permanent: false },
      { source: "/review-room", destination: "/feedback-studio", permanent: false },
    ];
  },
};

export default nextConfig;
