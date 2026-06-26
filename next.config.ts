import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async redirects() {
    return [
      { source: "/project-discovery", destination: "/business-discovery-studio", permanent: false },
      { source: "/draft-room/begin", destination: "/business-discovery-studio", permanent: false },
      { source: "/draft-room", destination: "/business-discovery-studio", permanent: false },
      { source: "/intake", destination: "/business-discovery-studio", permanent: false },
    ];
  },
};

export default nextConfig;
