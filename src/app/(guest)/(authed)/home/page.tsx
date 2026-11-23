import { ScreenPlaceholder } from "@/components/ScreenPlaceholder";
import { GuestLogoutButton } from "./GuestLogoutButton";

export default function Page() {
  return (
    <>
      <ScreenPlaceholder code="G02" title="ホーム" />
      <GuestLogoutButton />
    </>
  );
}
