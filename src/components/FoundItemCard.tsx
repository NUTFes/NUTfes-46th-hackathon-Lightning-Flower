import { Box, Flex, LinkBox, LinkOverlay, Stack, Text } from "@chakra-ui/react";
import NextLink from "next/link";
import type { ReactNode } from "react";
import type { FoundItem } from "@/lib/schemas/found-item";
import { formatItemDate } from "./DetailList";
import { itemColorLabels } from "./FoundItemDetailFields";
import { ItemThumbnail, type Photo } from "./ItemThumbnail";
import { StatusBadge, type FoundItemStatus } from "./StatusBadge";

export type FoundItemSummary = Pick<
  FoundItem,
  "id" | "displayNumber" | "category" | "color" | "foundPlace" | "foundAt"
> & {
  status: FoundItemStatus;
  thumbnail?: Photo;
  photos?: FoundItem["photos"];
};

type FoundItemCardProps = {
  item: FoundItemSummary;
  href?: string;
  selected?: boolean;
  actions?: ReactNode;
  showStatus?: boolean;
};

export function FoundItemCard({
  item,
  href,
  selected = false,
  actions,
  showStatus = true,
}: FoundItemCardProps) {
  const firstPhoto = item.photos?.[0];
  const thumbnail =
    item.thumbnail ??
    (firstPhoto && {
      id: firstPhoto.id,
      url: firstPhoto.thumbUrl || firstPhoto.url,
    });
  const title = item.category.name;

  return (
    <LinkBox
      as="article"
      borderWidth="1px"
      borderColor={selected ? "blue.600" : "gray.200"}
      bg={selected ? "blue.50" : "white"}
      rounded="lg"
      minH="114px"
      p="4"
    >
      <Flex align="start" gap="3">
        <ItemThumbnail photo={thumbnail} size="md" alt={title} />
        <Stack flex="1" minW="0" gap="0.5" overflowWrap="anywhere">
          <Flex align="center" justify="space-between" gap="1" flexWrap="wrap">
            <Text fontSize="xs" lineHeight="16px" color="gray.600">
              {item.displayNumber}
            </Text>
            {showStatus && <StatusBadge kind="found" status={item.status} />}
          </Flex>
          <Text fontSize="sm" lineHeight="20px" fontWeight="bold">
            {href ? (
              <LinkOverlay asChild>
                <NextLink href={href}>{title}</NextLink>
              </LinkOverlay>
            ) : (
              title
            )}
          </Text>
          <Text fontSize="xs" lineHeight="16px" color="gray.600">
            {itemColorLabels[item.color]}
          </Text>
          <Text fontSize="xs" lineHeight="16px" color="gray.600">
            {item.foundPlace} · {formatItemDate(item.foundAt)}
          </Text>
        </Stack>
      </Flex>
      {actions != null && (
        <Box position="relative" zIndex="1" mt="3">
          {actions}
        </Box>
      )}
    </LinkBox>
  );
}
