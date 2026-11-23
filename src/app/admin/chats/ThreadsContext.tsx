"use client";

import { createContext, useContext } from "react";

// スレッドの一覧を取り直す関数。チャットを送ったり本人確認をしたりしたあと、右側から左の一覧の
// 「返信待ち」やステータスを合わせるために呼ぶ（一覧はレイアウトにあり、右側を切り替えても消えない）
export const ThreadsRefreshContext = createContext<() => void>(() => {});

export function useRefreshThreads() {
  return useContext(ThreadsRefreshContext);
}
