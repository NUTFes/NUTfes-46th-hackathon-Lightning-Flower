"use client";

import { Flex, Text, VStack } from "@chakra-ui/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiHome, FiFileText, FiMessageCircle } from "react-icons/fi";

const navItems = [
  { label: "ホーム", href: "/home", icon: FiHome },
  { label: "申請", href: "/lost-reports/new", icon: FiFileText },
  { label: "チャット", href: "/chat", icon: FiMessageCircle },
];

export function GuestBottomNav() {
  const pathname = usePathname();

  return (
    <Flex
      as="nav"
      aria-label="ゲスト用ナビゲーション"
      justify="space-around"
      borderTopWidth="1px"
      borderColor="gray.200"
      bg="white"
      py="12px"
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link href={item.href} key={item.href}>
            <VStack gap="4px" color={isActive ? "blue.500" : "gray.500"}>
              <Icon size={24} />
              <Text fontSize="12px" fontWeight={isActive ? "bold" : "normal"}>
                {item.label}
              </Text>
            </VStack>
          </Link>
        );
      })}
    </Flex>
  );
}
