import { Box, Flex } from "@chakra-ui/react";
import { AppHeader } from "@/components/AppHeader";
import { GuestBottomNav } from "@/components/GuestBottomNav";
import { GuestChat } from "./GuestChat";

// G06 チャット。データは GuestChat（Client Component）が API から取る
export default async function Page({
  params,
}: PageProps<"/lost-reports/[id]/chat">) {
  const { id } = await params;
  return (
    // 画面の高さに収め、メッセージの一覧だけをスクロールさせる。
    // ヘッダー・チャット・下のナビは画面の幅いっぱいに出す（レイアウトの Container の余白を打ち消す）
    <Flex direction="column" h="100dvh" mx="-4">
      <AppHeader
        title="実行委員とのチャット"
        backHref={`/lost-reports/${id}`}
      />
      <Box flex="1" minH="0">
        {/* 申請が変わったら、メッセージやポーリングを作り直す */}
        <GuestChat key={id} reportId={id} />
      </Box>
      <GuestBottomNav />
    </Flex>
  );
}
