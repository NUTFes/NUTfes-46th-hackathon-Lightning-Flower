import { Box, Flex } from "@chakra-ui/react";
import { AppHeader } from "@/components/AppHeader";
import { GuestPickup } from "./GuestPickup";

// G07 受け取り方法。データは GuestPickup（Client Component）が API から取る
export default async function Page({
  params,
}: PageProps<"/lost-reports/[id]/pickup">) {
  const { id } = await params;
  return (
    <Flex direction="column" minH="100dvh">
      {/* ヘッダーは画面の幅いっぱいに出す（レイアウトの Container の余白を打ち消す） */}
      <Box mx="-4">
        <AppHeader title="受け取り方法" backHref={`/lost-reports/${id}/chat`} />
      </Box>
      <Box flex="1" py="5">
        <GuestPickup key={id} reportId={id} />
      </Box>
    </Flex>
  );
}
