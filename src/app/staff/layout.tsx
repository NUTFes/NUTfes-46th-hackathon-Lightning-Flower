import { Container } from "@chakra-ui/react";

// member（実行委員）の画面。スマホで見る前提の幅にする。admin も使える。
// ログインの確認は src/proxy.ts で行う（レイアウトでは下のページの実行を止められないため）

// ログインした人ごとに中身が違うので、静的なページとして作らない（キャッシュされないように）
export const dynamic = "force-dynamic";
export default function StaffLayout({ children }: LayoutProps<"/staff">) {
  return (
    <Container maxW="md" px="4">
      {children}
    </Container>
  );
}
