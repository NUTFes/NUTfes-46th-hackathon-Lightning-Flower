"use client";

import { useRouter } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import { signOutGuest } from "../actions";

// ログアウトしたら、トップ（/）へ戻す
export function GuestLogoutButton() {
  const router = useRouter();
  return (
    <LogoutButton
      role="guest"
      signOut={async () => {
        await signOutGuest();
        router.replace("/");
        router.refresh();
      }}
    />
  );
}
