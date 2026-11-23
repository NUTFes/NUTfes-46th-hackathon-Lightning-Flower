import { Suspense } from "react";
import { ChatsWorkspace } from "./ChatsWorkspace";

// A06 チャット・本人確認。左にスレッドの一覧、右に選んだ申請のチャットを出す。
// 一覧はレイアウトに置き、スレッドを切り替えても作り直さない。データは Client Component が API から取る
export default function ChatsLayout({ children }: LayoutProps<"/admin/chats">) {
  return (
    // useSearchParams（絞り込み）を使うので、Suspense で包む
    <Suspense>
      <ChatsWorkspace>{children}</ChatsWorkspace>
    </Suspense>
  );
}
