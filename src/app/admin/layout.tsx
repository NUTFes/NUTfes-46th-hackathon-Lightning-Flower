import { Box, Flex } from "@chakra-ui/react";
import { AdminSidebar } from "@/components/AdminSidebar";

// admin（本部）の画面。PC で見る前提で、左にメニューを置く。
// admin かどうかの確認は src/proxy.ts で行う（レイアウトでは下のページの実行を止められないため）

// ログインした人ごとに中身が違うので、静的なページとして作らない（キャッシュされないように）
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Flex minH="100dvh">
      <AdminSidebar showBrand />
      <Box flex="1" px="8">
        {children}
      </Box>
    </Flex>
  );
}
