import type { NextConfig } from "next";

// Docker（macOS のファイル共有）の中では、起動後に作ったフォルダ（新しいページや API）を
// 開発サーバーが検知できない。コンテナの中だけ、ファイルの変更をポーリングで見る（compose.yaml で指定）
const pollIntervalMs = Number(process.env.NEXT_WATCH_POLL_MS) || undefined;

const nextConfig: NextConfig = {
  // 開発サーバーは、起動したときのホスト名（コンテナでは 0.0.0.0）と localhost からしか、
  // 開発用のファイル（/_next/ の JS・HMR）を読ませない。http://127.0.0.1:<APP_PORT> で開いても
  // 画面が動く（hydration される）ように、127.0.0.1 も許す
  allowedDevOrigins: ["127.0.0.1"],
  ...(pollIntervalMs && { watchOptions: { pollIntervalMs } }),
  experimental: {
    // Chakra UI の import を必要な分だけに絞る（Chakra UI の Next.js ガイドの推奨）
    optimizePackageImports: ["@chakra-ui/react"],
  },
};

export default nextConfig;
