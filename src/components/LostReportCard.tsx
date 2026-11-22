import {
  Flex,
  Icon,
  LinkBox,
  LinkOverlay,
  Stack,
  Text,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { FiChevronRight } from "react-icons/fi";
import type { LostReport } from "@/lib/schemas/lost-report";
import { StatusBadge } from "./StatusBadge";

export type LostReportSummary = Pick<
  LostReport,
  "id" | "displayNumber" | "category" | "features" | "status"
> & {
  color?: string;
};

type LostReportCardProps = { report: LostReportSummary; href: string };

export function LostReportCard({ report, href }: LostReportCardProps) {
  return (
    <LinkBox
      as="article"
      bg="white"
      borderWidth="1px"
      borderColor="gray.200"
      rounded="lg"
      p="4"
    >
      <Flex align="center" justify="space-between" wrap="wrap" gap="2">
        <Stack flex="1" minW="0" gap="1" overflowWrap="anywhere">
          <Text fontSize="xs" lineHeight="16px" color="gray.600">
            {report.displayNumber}
          </Text>
          <Text fontSize="sm" lineHeight="20px" fontWeight="bold">
            <LinkOverlay asChild>
              <NextLink href={href}>
                {report.features || report.category.name}
              </NextLink>
            </LinkOverlay>
          </Text>
          <Text fontSize="xs" lineHeight="16px" color="gray.600">
            {report.category.name}
            {report.color && ` · ${report.color}`}
          </Text>
        </Stack>
        <Flex align="center" gap="1">
          <StatusBadge kind="lost" status={report.status} />
          <Icon color="gray.500" boxSize="4">
            <FiChevronRight />
          </Icon>
        </Flex>
      </Flex>
    </LinkBox>
  );
}
