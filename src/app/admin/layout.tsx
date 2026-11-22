import { Box, Flex, Link, Stack, Text } from "@chakra-ui/react";
import NextLink from "next/link";

// admin（本部）の画面。PC で見る前提で、左にメニューを置く。
// admin かどうかの確認は src/proxy.ts で行う（レイアウトでは下のページの実行を止められないため）
const menu = [
  { href: "/admin", label: "ダッシュボード" },
  { href: "/admin/found-items", label: "拾得物一覧" },
  { href: "/admin/lost-reports", label: "遺失物申請一覧" },
  { href: "/admin/chats", label: "チャット" },
  { href: "/admin/period-end", label: "期間終了処理" },
  { href: "/admin/settings", label: "設定" },
] as const;

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Flex minH="100dvh">
      <Box as="nav" w="56" flexShrink={0} borderRightWidth="1px" p="4">
        <Text fontWeight="bold" mb="4">
          オトシル 本部
        </Text>
        <Stack gap="1">
          {menu.map((item) => (
            <Link key={item.href} asChild>
              <NextLink href={item.href}>{item.label}</NextLink>
            </Link>
          ))}
        </Stack>
      </Box>
      <Box flex="1" px="8">
        {children}
      </Box>
    </Flex>
  );
}
