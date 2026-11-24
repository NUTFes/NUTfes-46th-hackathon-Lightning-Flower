import { Box, Flex, Stack } from "@chakra-ui/react";
import { AppHeader } from "@/components/AppHeader";
import { GuestBottomNav } from "@/components/GuestBottomNav";
import { LostReportStatusView } from "./LostReportStatusView";

// G05 申請状況。データは LostReportStatusView（Client Component）が API から取る
export default async function Page({
  params,
}: PageProps<"/lost-reports/[id]">) {
  const { id } = await params;
  return (
    // 中身が短くても、下のナビを画面の下に置く
    <Flex direction="column" minH="100dvh">
      {/* ヘッダーと下のナビは画面の幅いっぱいに出す（レイアウトの Container の余白を打ち消す） */}
      <Box mx="-4">
        <AppHeader title="申請状況" backHref="/home" />
      </Box>

      <Stack flex="1" py="5">
        <LostReportStatusView reportId={id} />
      </Stack>

      <Box position="sticky" bottom="0" mx="-4">
        <GuestBottomNav />
      </Box>
    </Flex>
  );
}
