import { Box, Stack } from "@chakra-ui/react";
import { AppHeader } from "@/components/AppHeader";
import { CancelReportScreen } from "./CancelReportScreen";

// G08 申請取り消し。データは CancelReportScreen（Client Component）が API から取る
export default async function Page({
  params,
}: PageProps<"/lost-reports/[id]/cancel">) {
  const { id } = await params;
  return (
    <>
      {/* ヘッダーは画面の幅いっぱいに出す（レイアウトの Container の余白を打ち消す） */}
      <Box mx="-4">
        <AppHeader title="申請の取り消し" backHref={`/lost-reports/${id}`} />
      </Box>
      <Stack py="5">
        <CancelReportScreen reportId={id} />
      </Stack>
    </>
  );
}
