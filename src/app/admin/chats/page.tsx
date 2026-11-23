import { EmptyState } from "@/components/EmptyState";

// A06 でスレッドを選んでいないとき
export default function Page() {
  return (
    <EmptyState
      title="チャットを選んでください"
      description="左の一覧からスレッドを選ぶと、メッセージと本人確認の操作が出ます。"
    />
  );
}
