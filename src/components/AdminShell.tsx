import { Box, Flex } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopBar, type AdminTopBarProps } from "./AdminTopBar";

type AdminShellProps = AdminTopBarProps & {
  children: ReactNode;
};

export function AdminShell({ children, email, role }: AdminShellProps) {
  return (
    <Flex direction="column" minH="100dvh" bg="gray.50">
      <AdminTopBar email={email} role={role} />
      <Flex flex="1">
        <AdminSidebar />
        <Box as="main" flex="1" minW="0" p="8">
          {children}
        </Box>
      </Flex>
    </Flex>
  );
}
