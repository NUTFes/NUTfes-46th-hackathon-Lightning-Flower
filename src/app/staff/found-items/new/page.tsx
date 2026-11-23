import { Box } from "@chakra-ui/react";
import { AppHeader } from "@/components/AppHeader";
import { FoundItemCreate } from "./FoundItemCreate";

// M02 拾得物登録。カテゴリの取得と登録は FoundItemCreate（Client Component）が API で行う
export default function Page() {
  return (
    <>
      {/* ヘッダーは画面の端まで広げる（レイアウトの Container の px="4" を打ち消す） */}
      <Box mx="-4">
        <AppHeader title="拾得物を登録" backHref="/staff" />
      </Box>
      <FoundItemCreate />
    </>
  );
}
