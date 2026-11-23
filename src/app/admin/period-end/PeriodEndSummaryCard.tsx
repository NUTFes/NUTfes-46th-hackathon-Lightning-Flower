import { Button, Flex, Stack, Text } from "@chakra-ui/react";
import { BadgePill } from "@/components/BadgePill";

const numberFormat = new Intl.NumberFormat("ja-JP");

// 期間終了処理（A07）の集計カード。Figma「Components / Admin」の PeriodEndSummaryCard
export function PeriodEndSummaryCard({
  title,
  badge,
  description,
  count,
  selected,
  onShow,
}: {
  title: string;
  badge: { label: string; tone: "danger" | "neutral" };
  description: string;
  count: number | null;
  selected: boolean;
  onShow: () => void;
}) {
  return (
    <Stack
      as="section"
      aria-label={title}
      flex="1"
      minW="16rem"
      gap="1"
      p="5"
      bg="white"
      borderWidth="1px"
      borderColor={selected ? "blue.300" : "gray.200"}
      rounded="xl"
    >
      <Flex align="center" gap="2">
        <Text fontSize="lg" fontWeight="bold">
          {title}
        </Text>
        <BadgePill label={badge.label} tone={badge.tone} />
      </Flex>
      <Text fontSize="sm" color="fg.muted">
        {description}
      </Text>
      <Flex align="end" justify="space-between" gap="3">
        <Text fontSize="3xl" fontWeight="bold" lineHeight="1.2">
          {count === null ? "—" : `${numberFormat.format(count)}件`}
        </Text>
        <Button
          variant="outline"
          onClick={onShow}
          aria-pressed={selected}
          disabled={count === null}
        >
          対象を確認
        </Button>
      </Flex>
    </Stack>
  );
}
