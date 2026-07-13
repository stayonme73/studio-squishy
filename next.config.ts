import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    authInterrupts: true,
  },
  async redirects() {
    return [
      { source: "/studio-plan-review", destination: "/route-map", permanent: false },
      { source: "/project-summary", destination: "/route-map", permanent: false },
      { source: "/project-details", destination: "/route-map?step=intake", permanent: false },
      { source: "/payment", destination: "/checkout", permanent: false },
      { source: "/discovery-summary", destination: "/route-map", permanent: false },
      { source: "/studio-guide", destination: "/route-map", permanent: false },
      { source: "/studio-guide-prototype", destination: "/route-map", permanent: false },
      { source: "/review-room", destination: "/feedback-studio", permanent: false },
    ];
  },
};

export default nextConfig;
