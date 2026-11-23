import { ChatRoom } from "./ChatRoom";

// A06 で 1 つの申請のチャットを開いたとき。データは ChatRoom（Client Component）が API から取る
export default async function Page({
  params,
}: PageProps<"/admin/chats/[lostReportId]">) {
  const { lostReportId } = await params;
  // 申請が変わったら、メッセージやポーリングを作り直す
  return <ChatRoom key={lostReportId} reportId={lostReportId} />;
}
