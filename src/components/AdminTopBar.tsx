import { Badge, Flex, Text } from "@chakra-ui/react";
import type { Me } from "@/lib/schemas/me";

type Role = Me["role"];

export type AdminTopBarProps = {
  email: string;
  role: Role;
};

export function AdminTopBar({ email, role }: AdminTopBarProps) {
  return (
    <Flex
      as="header"
      minH="53px"
      align="center"
      justify="space-between"
      gap="4"
      px="6"
      py="2"
      bg="white"
      borderBottomWidth="1px"
      borderColor="gray.200"
    >
      <Flex align="baseline" gap="4" flexShrink={0}>
        <Text color="blue.600" fontSize="lg" fontWeight="bold">
          オトシル
        </Text>
        <Text color="gray.600" fontSize="sm">
          管理画面 / 本部
        </Text>
      </Flex>
      <Flex align="center" justify="flex-end" gap="3" minW="0">
        <Badge colorPalette="blue" variant="subtle" rounded="full">
          {role}
        </Badge>
        <Text color="gray.600" fontSize="sm" overflowWrap="anywhere">
          {email}
        </Text>
      </Flex>
    </Flex>
  );
}
