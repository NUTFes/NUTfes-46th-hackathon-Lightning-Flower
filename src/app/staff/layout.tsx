import { Container } from "@chakra-ui/react";
import { headers } from "next/headers";
import { AuthMessage } from "@/components/AuthMessage";
import { getStaff } from "@/lib/auth/staff";

// member（実行委員）の画面。スマホで見る前提の幅にする。admin も使える。
// ここでのチェックは画面の出し分けだけ。データは API 側で必ず権限を確かめる。
export default async function StaffLayout({ children }: LayoutProps<"/staff">) {
  const staff = await getStaff(await headers());
  if (!staff) {
    return (
      <AuthMessage
        title="ログインしてください"
        description="実行委員の画面は、staff 用のアドレスから Cloudflare Access でログインして開きます。"
      />
    );
  }

  return (
    <Container maxW="md" px="4">
      {children}
    </Container>
  );
}
