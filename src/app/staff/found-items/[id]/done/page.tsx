import { Box } from "@chakra-ui/react";
import { AppHeader } from "@/components/AppHeader";
import { FoundItemDone } from "./FoundItemDone";

// M03 登録完了。管理番号は FoundItemDone（Client Component）が API から取る
export default async function Page({
  params,
}: PageProps<"/staff/found-items/[id]/done">) {
  const { id } = await params;
  return (
    <>
      <Box mx="-4">
        <AppHeader title="登録完了" />
      </Box>
      <FoundItemDone id={id} />
    </>
  );
}
