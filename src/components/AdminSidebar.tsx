"use client";

import { Link, Stack, Text } from "@chakra-ui/react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import {
  FiArchive,
  FiFileText,
  FiGrid,
  FiMessageCircle,
  FiPackage,
  FiSettings,
} from "react-icons/fi";

const menu = [
  { href: "/admin", label: "ダッシュボード", icon: FiGrid },
  { href: "/admin/found-items", label: "拾得物一覧", icon: FiPackage },
  { href: "/admin/lost-reports", label: "遺失物申請一覧", icon: FiFileText },
  { href: "/admin/chats", label: "チャット", icon: FiMessageCircle },
  { href: "/admin/period-end", label: "期間終了処理", icon: FiArchive },
  { href: "/admin/settings", label: "設定", icon: FiSettings },
] as const;

export function AdminSidebar({ showBrand = false }: { showBrand?: boolean }) {
  const pathname = usePathname();

  return (
    <Stack
      as="nav"
      aria-label="管理画面メニュー"
      w={showBrand ? "56" : "220px"}
      flexShrink={0}
      gap="2"
      p="3"
      bg="white"
      borderRightWidth="1px"
      borderColor="gray.200"
    >
      {showBrand && (
        <Text fontWeight="bold" px="1" pt="1" mb="2">
          オトシル 本部
        </Text>
      )}
      {menu.map(({ href, label, icon: Icon }) => {
        const isCurrentPage = pathname === href;
        const isActive =
          isCurrentPage ||
          (href !== "/admin" && pathname.startsWith(`${href}/`));

        return (
          <Link
            key={href}
            asChild
            aria-current={
              isCurrentPage ? "page" : isActive ? "location" : undefined
            }
            gap="3"
            minH="10"
            px="3"
            py="2"
            rounded="md"
            bg={isActive ? "blue.50" : undefined}
            color={isActive ? "blue.700" : "gray.900"}
            fontSize="sm"
            fontWeight={isActive ? "semibold" : "normal"}
            _hover={{ bg: isActive ? "blue.100" : "gray.100" }}
          >
            <NextLink href={href}>
              <Icon aria-hidden="true" size={16} />
              {label}
            </NextLink>
          </Link>
        );
      })}
    </Stack>
  );
}
