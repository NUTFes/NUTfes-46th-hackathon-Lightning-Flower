import { ScreenPlaceholder } from "@/components/ScreenPlaceholder";

export default async function Page({
  params,
}: PageProps<"/admin/chats/[lostReportId]">) {
  const { lostReportId } = await params;
  return (
    <ScreenPlaceholder
      code="A06"
      title={`チャット・本人確認（lostReportId: ${lostReportId}）`}
    />
  );
}
