import { Flex, Icon, Stack, Text } from "@chakra-ui/react";
import { FiMapPin } from "react-icons/fi";

type HqLocationCardProps = {
  label?: string;
  name: string;
  note?: string;
};

export function HqLocationCard({
  label = "本部の場所",
  name,
  note,
}: HqLocationCardProps) {
  return (
    <Flex
      align="start"
      gap="3"
      p="4"
      bg="blue.50"
      borderWidth="1px"
      borderColor="blue.100"
      rounded="lg"
    >
      <Icon boxSize="5" color="blue.700">
        <FiMapPin />
      </Icon>
      <Stack gap="1" minW="0" overflowWrap="anywhere">
        <Text fontSize="xs" color="blue.700" fontWeight="bold">
          {label}
        </Text>
        <Text fontSize="sm" fontWeight="bold">
          {name}
        </Text>
        {note && (
          <Text fontSize="xs" color="gray.600">
            {note}
          </Text>
        )}
      </Stack>
    </Flex>
  );
}
