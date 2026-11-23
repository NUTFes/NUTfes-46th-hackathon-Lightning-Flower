import { ConsentGate } from "./ConsentGate";

// guest がログインしてから使う画面（/home・/lost-reports）。
// ログインしていなければ、src/proxy.ts がトップ（/）へ戻す。
// ここに画面（/home・/lost-reports と違うパス）を足したら、src/proxy.ts の GUEST_AUTHED_PATHS と matcher にも足す。
// 個人情報の取り扱いにまだ同意していなければ、ConsentGate が画面の前で同意を求める。
// レイアウトでの確認は画面の出し分けだけなので、データを返す API では requireGuest で必ず確かめる。
export default function GuestAuthedLayout({ children }: LayoutProps<"/">) {
  return <ConsentGate>{children}</ConsentGate>;
}
