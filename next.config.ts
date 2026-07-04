import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    authInterrupts: true,
  },
  async redirects() {
    return [
      { source: "/studio-plan-review", destination: "/project-summary", permanent: false },
      { source: "/review-room", destination: "/feedback-studio", permanent: false },
    ];
  },
};

export default nextConfig;
