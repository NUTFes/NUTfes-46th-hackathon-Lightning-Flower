import { Box, Flex } from "@chakra-ui/react";
import { AppHeader } from "@/components/AppHeader";
import { GuestBottomNav } from "@/components/GuestBottomNav";
import { GuestPickup } from "./GuestPickup";

// G07 受け取り方法。データは GuestPickup（Client Component）が API から取る
export default async function Page({
  params,
}: PageProps<"/lost-reports/[id]/pickup">) {
  const { id } = await params;
  return (
    // 中身が短くても、下のナビを画面の下に置く（G02 と同じ）
    <Flex direction="column" minH="100dvh">
      {/* ヘッダーと下のナビは画面の幅いっぱいに出す（レイアウトの Container の余白を打ち消す） */}
      <Box mx="-4">
        <AppHeader title="受け取り方法" backHref={`/lost-reports/${id}/chat`} />
      </Box>
      <Box flex="1" py="5">
        <GuestPickup key={id} reportId={id} />
      </Box>
      <Box position="sticky" bottom="0" mx="-4">
        <GuestBottomNav />
      </Box>
    </Flex>
  );
}
