import { Center, Heading, Icon, Stack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { FiCheck } from "react-icons/fi";

type CompletionPanelProps = {
  title: string;
  numberLabel: string;
  number: string;
  children?: ReactNode;
  actions: ReactNode;
};

export function CompletionPanel({
  title,
  numberLabel,
  number,
  children,
  actions,
}: CompletionPanelProps) {
  return (
    <Stack gap="4" align="stretch">
      <Stack align="center" textAlign="center" gap="4">
        <Center boxSize="72px" rounded="full" bg="green.100" color="green.700">
          <Icon boxSize="8">
            <FiCheck />
          </Icon>
        </Center>
        <Heading as="h2" size="lg">
          {title}
        </Heading>
      </Stack>
      <Stack
        gap="1"
        bg="white"
        borderWidth="1px"
        borderColor="gray.200"
        rounded="lg"
        p="4"
      >
        <Text fontSize="xs" color="gray.600">
          {numberLabel}
        </Text>
        <Text fontSize="2xl" fontWeight="bold" overflowWrap="anywhere">
          {number}
        </Text>
        {children}
      </Stack>
      <Stack gap="4">{actions}</Stack>
    </Stack>
  );
}
