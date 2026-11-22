import { Container } from "@chakra-ui/react";

// guest（参加者）の画面。スマホで見る前提の幅にする。
// ログイン前のトップ（/）もここに入る。ログインが要る画面は (authed) の下に置く
export default function GuestLayout({ children }: LayoutProps<"/">) {
  return (
    <Container maxW="md" px="4">
      {children}
    </Container>
  );
}
