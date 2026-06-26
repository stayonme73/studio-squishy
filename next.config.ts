import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async redirects() {
    return [
      { source: "/project-discovery", destination: "/business-discovery-studio", permanent: false },
    ];
  },
};

export default nextConfig;
