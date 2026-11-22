import type { Metadata } from "next";
import { AuthMessage } from "@/components/AuthMessage";

export const metadata: Metadata = { robots: { index: false } };

// src/proxy.ts が、ログインしていないときに /staff・/admin の代わりに出す（401）
export default function Page() {
  return (
    <AuthMessage
      title="ログインしてください"
      description="実行委員・本部の画面は、staff 用のアドレスから Cloudflare Access でログインして開きます。"
    />
  );
}
