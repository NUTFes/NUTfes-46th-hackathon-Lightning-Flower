import { Box, Flex, Stack } from "@chakra-ui/react";
import { AppHeader } from "@/components/AppHeader";
import { GuestBottomNav } from "@/components/GuestBottomNav";
import { LostReportCreate } from "./LostReportCreate";

// G03 遺失物申請フォーム。カテゴリの取得と申請は LostReportCreate（Client Component）が API で行う
export default function Page() {
  return (
    // 中身が短くても、下のナビを画面の下に置く
    <Flex direction="column" minH="100dvh">
      {/* ヘッダーと下のナビは画面の幅いっぱいに出す（レイアウトの Container の余白を打ち消す） */}
      <Box mx="-4">
        <AppHeader title="遺失物を申請" backHref="/home" />
      </Box>

      <Stack flex="1" pt="4">
        <LostReportCreate />
      </Stack>

      <Box position="sticky" bottom="0" mx="-4">
        <GuestBottomNav />
      </Box>
    </Flex>
  );
}
