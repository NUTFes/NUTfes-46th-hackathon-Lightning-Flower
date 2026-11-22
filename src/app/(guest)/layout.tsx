import { Container } from "@chakra-ui/react";

// guest（参加者）の画面。スマホで見る前提の幅にする。
// TODO: ログインが要る画面（/home 以下）のチェックは、guest のログインを作るときに足す
// （getGuest は DB・API の共通部品の PR で src/lib/auth/guest.ts に入る）
export default function GuestLayout({ children }: LayoutProps<"/">) {
  return (
    <Container maxW="md" px="4">
      {children}
    </Container>
  );
}
