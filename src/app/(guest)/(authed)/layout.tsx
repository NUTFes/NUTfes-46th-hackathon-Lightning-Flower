// guest がログインしてから使う画面（/home・/lost-reports）。
// TODO: guest のログインを作るときに、ログインしていなければトップ（/）へ戻す処理を足す。
// レイアウトでの確認は画面の出し分けだけなので、データを返す API では requireGuest で必ず確かめる。
export default function GuestAuthedLayout({ children }: LayoutProps<"/">) {
  return children;
}
