import { Box, Flex, Link, Stack, Text } from "@chakra-ui/react";
import { headers } from "next/headers";
import NextLink from "next/link";
import { AuthMessage } from "@/components/AuthMessage";
import { getStaff } from "@/lib/auth/staff";

// admin（本部）の画面。PC で見る前提で、左にメニューを置く。
// ここでのチェックは画面の出し分けだけ。データは API 側で必ず権限を確かめる。
const menu = [
  { href: "/admin", label: "ダッシュボード" },
  { href: "/admin/found-items", label: "拾得物一覧" },
  { href: "/admin/lost-reports", label: "遺失物申請一覧" },
  { href: "/admin/chats", label: "チャット" },
  { href: "/admin/period-end", label: "期間終了処理" },
  { href: "/admin/settings", label: "設定" },
] as const;

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const staff = await getStaff(await headers());
  if (!staff) {
    return (
      <AuthMessage
        title="ログインしてください"
        description="本部の画面は、staff 用のアドレスから Cloudflare Access でログインして開きます。"
      />
    );
  }
  if (staff.role !== "admin") {
    return (
      <AuthMessage
        title="この画面を開く権限がありません"
        description="本部のアカウントでログインしてください。"
      />
    );
  }

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
