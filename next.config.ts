import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Chakra UI の import を必要な分だけに絞る（Chakra UI の Next.js ガイドの推奨）
    optimizePackageImports: ["@chakra-ui/react"],
  },
};

export default nextConfig;
