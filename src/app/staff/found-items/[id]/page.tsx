import { Box } from "@chakra-ui/react";
import { AppHeader } from "@/components/AppHeader";
import { FoundItemDetail } from "./FoundItemDetail";

// M04 拾得物詳細。データの取得・編集・削除は FoundItemDetail（Client Component）が API で行う
export default async function Page({
  params,
}: PageProps<"/staff/found-items/[id]">) {
  const { id } = await params;
  return (
    <>
      {/* ヘッダーは画面の端まで広げる（レイアウトの Container の px="4" を打ち消す） */}
      <Box mx="-4">
        <AppHeader title="拾得物詳細" backHref="/staff" />
      </Box>
      <FoundItemDetail id={id} />
    </>
  );
}
