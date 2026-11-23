import { EmptyState as ChakraEmptyState } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { FiInbox } from "react-icons/fi";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <ChakraEmptyState.Root
      size="sm"
      py="8"
      px="4"
      bg="white"
      borderWidth="1px"
      borderColor="gray.200"
      rounded="lg"
    >
      <ChakraEmptyState.Content>
        <ChakraEmptyState.Indicator aria-hidden="true">
          <FiInbox />
        </ChakraEmptyState.Indicator>
        <ChakraEmptyState.Title>{title}</ChakraEmptyState.Title>
        {description && (
          <ChakraEmptyState.Description>
            {description}
          </ChakraEmptyState.Description>
        )}
        {action}
      </ChakraEmptyState.Content>
    </ChakraEmptyState.Root>
  );
}
