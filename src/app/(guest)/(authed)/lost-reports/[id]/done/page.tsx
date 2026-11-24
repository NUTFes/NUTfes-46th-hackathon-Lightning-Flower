import { Box } from "@chakra-ui/react";
import { AppHeader } from "@/components/AppHeader";
import { LostReportDone } from "./LostReportDone";

// G04 申請完了。申請の中身は LostReportDone（Client Component）が API から取る
export default async function Page({
  params,
}: PageProps<"/lost-reports/[id]/done">) {
  const { id } = await params;
  return (
    <>
      {/* ヘッダーは画面の端まで広げる（レイアウトの Container の px="4" を打ち消す） */}
      <Box mx="-4">
        <AppHeader title="申請が完了しました" />
      </Box>
      <LostReportDone id={id} />
    </>
  );
}
