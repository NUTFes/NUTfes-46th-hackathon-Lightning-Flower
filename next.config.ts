import type { NextConfig } from "next";

// Docker（macOS のファイル共有）の中では、起動後に作ったフォルダ（新しいページや API）を
// 開発サーバーが検知できない。コンテナの中だけ、ファイルの変更をポーリングで見る（compose.yaml で指定）
const pollIntervalMs = Number(process.env.NEXT_WATCH_POLL_MS) || undefined;

const nextConfig: NextConfig = {
  ...(pollIntervalMs && { watchOptions: { pollIntervalMs } }),
  experimental: {
    // Chakra UI の import を必要な分だけに絞る（Chakra UI の Next.js ガイドの推奨）
    optimizePackageImports: ["@chakra-ui/react"],
  },
};

export default nextConfig;
