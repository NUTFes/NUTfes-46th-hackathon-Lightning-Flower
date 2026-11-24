import { Box, Flex, Stack } from "@chakra-ui/react";
import { AppHeader } from "@/components/AppHeader";
import { GuestBottomNav } from "@/components/GuestBottomNav";
import { GuestHome } from "./GuestHome";
import { GuestLogoutButton } from "./GuestLogoutButton";

// G02 ホーム。データは GuestHome（Client Component）が GET /api/my/lost-reports から取る
export default function Page() {
  return (
    // 中身が短くても、下のナビを画面の下に置く
    <Flex direction="column" minH="100dvh">
      {/* ヘッダーと下のナビは画面の幅いっぱいに出す（レイアウトの Container の余白を打ち消す） */}
      <Box mx="-4">
        <AppHeader title="ようこそ、オトシルへ" />
      </Box>

      <Stack flex="1" gap="6" py="5">
        <GuestHome />
        <Box alignSelf="flex-end">
          <GuestLogoutButton />
        </Box>
      </Stack>

      <Box position="sticky" bottom="0" mx="-4">
        <GuestBottomNav />
      </Box>
    </Flex>
  );
}
