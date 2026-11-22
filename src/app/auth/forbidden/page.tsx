import type { Metadata } from "next";
import { AuthMessage } from "@/components/AuthMessage";

export const metadata: Metadata = { robots: { index: false } };

// src/proxy.ts が、admin でない人が /admin を開いたときに代わりに出す（403）
export default function Page() {
  return (
    <AuthMessage
      title="この画面を開く権限がありません"
      description="本部のアカウントでログインし直してください。"
    />
  );
}
