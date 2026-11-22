import { Box, Flex, Heading } from "@chakra-ui/react";
import Link from "next/link";
import type { ReactNode } from "react";

type AppHeaderProps = {
  title: string;
  backHref?: string;
  rightSlot?: ReactNode;
};

export function AppHeader({ title, backHref, rightSlot }: AppHeaderProps) {
  return (
    <Flex
      as="header"
      align="center"
      gap="12px"
      px="22px"
      py="16px"
      minH="64px"
      borderBottomWidth="1px"
      borderColor="gray.200"
      bg="white"
    >
      {backHref && (
        <Link href={backHref} aria-label="戻る">
          ←
        </Link>
      )}

      <Heading as="h1" fontSize="20px" fontWeight="bold" flex="1">
        {title}
      </Heading>

      {rightSlot && <Box>{rightSlot}</Box>}
    </Flex>
  );
}
