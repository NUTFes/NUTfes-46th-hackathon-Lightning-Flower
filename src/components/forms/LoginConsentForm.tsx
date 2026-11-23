"use client";

import { Button, Checkbox } from "@chakra-ui/react";
import NextLink from "next/link";
import { useState } from "react";
import styles from "./Form.module.css";

// guest のログイン画面。個人情報の取り扱いに同意するまで、ログインのボタンを押せないようにする。
// ボタンは /auth/login?provider=…&next=…&consent=1 へ移る（OAuth を始める Route Handler は別に作る。
// 同意した日時は、その Route Handler かログイン後のコールバックで guests.agreed_at に入れる）
export function LoginConsentForm({
  providers,
  callbackUrl,
}: {
  providers: { id: string; name: string }[];
  callbackUrl?: string;
}) {
  const [agreed, setAgreed] = useState(false);

  function loginHref(providerId: string) {
    const params = new URLSearchParams({ provider: providerId, consent: "1" });
    if (callbackUrl) params.set("next", callbackUrl);
    return `/auth/login?${params}`;
  }

  return (
    <div className={styles.form}>
      <div className={styles.consentBox}>
        落とし物の照合と受け渡しの連絡のために、メールアドレスと申請の内容を使います。
        技大祭の終了後、一定の期間がたったら削除します。くわしくは
        <NextLink href="/privacy">個人情報の取り扱い</NextLink>
        をご覧ください。
      </div>

      <Checkbox.Root
        checked={agreed}
        onCheckedChange={(details) => setAgreed(details.checked === true)}
      >
        <Checkbox.HiddenInput />
        <Checkbox.Control />
        <Checkbox.Label>個人情報の取り扱いに同意する</Checkbox.Label>
      </Checkbox.Root>

      <div className={styles.actions}>
        {providers.map((provider) =>
          agreed ? (
            <Button
              key={provider.id}
              asChild
              colorPalette="blue"
              className={styles.providerButton}
            >
              <a href={loginHref(provider.id)}>{provider.name}でログイン</a>
            </Button>
          ) : (
            <Button
              key={provider.id}
              colorPalette="blue"
              className={styles.providerButton}
              disabled
            >
              {provider.name}でログイン
            </Button>
          ),
        )}
        {!agreed && <p className={styles.hint}>同意するとログインできます</p>}
      </div>
    </div>
  );
}
