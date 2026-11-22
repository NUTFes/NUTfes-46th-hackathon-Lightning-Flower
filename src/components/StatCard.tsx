import { Box, LinkBox, LinkOverlay, Text } from "@chakra-ui/react";
import NextLink from "next/link";
import type { ReactNode } from "react";

type StatCardProps = {
  label: string;
  value: number;
  href?: string;
  description?: string;
  action?: ReactNode;
};

const numberFormat = new Intl.NumberFormat("ja-JP");

export function StatCard({
  label,
  value,
  href,
  description,
  action,
}: StatCardProps) {
  return (
    <LinkBox
      as="article"
      bg="white"
      borderWidth="1px"
      borderColor="gray.200"
      rounded="lg"
      p="4"
    >
      <Text
        fontSize="xs"
        lineHeight="16px"
        color="gray.600"
        overflowWrap="anywhere"
      >
        {href ? (
          <LinkOverlay asChild>
            <NextLink href={href}>{label}</NextLink>
          </LinkOverlay>
        ) : (
          label
        )}
      </Text>
      <Text mt="1" fontSize="2xl" lineHeight="32px" fontWeight="bold">
        {numberFormat.format(value)}
      </Text>
      {description && (
        <Text mt="2" fontSize="xs" color="gray.600">
          {description}
        </Text>
      )}
      {action != null && (
        <Box position="relative" zIndex="1" mt="3">
          {action}
        </Box>
      )}
    </LinkBox>
  );
}
