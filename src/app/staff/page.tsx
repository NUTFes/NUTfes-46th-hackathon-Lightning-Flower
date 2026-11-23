import { Box } from "@chakra-ui/react";
import { AppHeader } from "@/components/AppHeader";
import { StaffFab } from "@/components/StaffFab";
import { FoundItemSearch } from "./FoundItemSearch";

// M01 拾得物一覧・検索。データは FoundItemSearch（Client Component）が API から取る
export default function Page() {
  return (
    <>
      {/* ヘッダーは画面の端まで広げる（レイアウトの Container の px="4" を打ち消す） */}
      <Box mx="-4">
        <AppHeader title="拾得物をさがす" />
      </Box>
      <FoundItemSearch />
      <StaffFab href="/staff/found-items/new" label="拾得物を登録" />
    </>
  );
}
