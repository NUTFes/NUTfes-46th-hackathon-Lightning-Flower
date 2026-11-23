import { Text } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { ScreenPlaceholder } from "@/components/ScreenPlaceholder";
import { getGuest } from "@/lib/auth/guest";
import { GUEST_PROVIDERS } from "@/lib/auth/login";
import { safeNextPath } from "@/lib/auth/redirect";
import { LoginConsentForm } from "./LoginConsentForm";

const providerNames = { google: "Google" } as const;

// ?next= はログインのあとに戻る先（src/proxy.ts がログインの要る画面から付ける）。
// ?error=login はログインに失敗して戻ってきたとき（/auth/login・/auth/callback が付ける）
export default async function Page({ searchParams }: PageProps<"/">) {
  const { next, error } = await searchParams;
  const nextPath = safeNextPath(typeof next === "string" ? next : null);

  // ログイン済みなら、そのまま戻る先へ（同意していなければ、その画面で同意を求める）
  if (await getGuest()) redirect(nextPath);

  return (
    <>
      <ScreenPlaceholder code="G01" title="トップ・ログイン前" />
      {error === "login" && (
        <Text role="alert" color="#b42318" mb="4">
          ログインできませんでした。もう一度お試しください。
        </Text>
      )}
      <LoginConsentForm
        providers={GUEST_PROVIDERS.map((id) => ({
          id,
          name: providerNames[id],
        }))}
        callbackUrl={nextPath}
      />
    </>
  );
}
