"use client";

import { Box, Button, Spinner, Stack, Text } from "@chakra-ui/react";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Checkbox } from "@/components/Checkbox";
import styles from "@/components/Form.module.css";
import type { Me } from "@/lib/schemas/me";

// ログインしたあと、個人情報の取り扱いにまだ同意していない guest に、画面の前で同意を求める。
// ふつうはログインの画面（G01）で同意してからログインするので、ここには来ない。
// 同意の記録に失敗したときや、ほかのサイトのリンクからログインしたときの受け皿（POST /api/me/consent）。
// 画面の出し分けだけなので、申請の API（POST /api/lost-reports）でも同意を必ず確かめている
type State = "loading" | "consented" | "required" | "error";

export function ConsentGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>("loading");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let ignore = false;
    (async () => {
      const res = await fetch("/api/me");
      if (res.status === 401) {
        // 画面を開いたあとにセッションが切れた。トップでログインし直してもらう
        router.replace(`/?next=${encodeURIComponent(pathname)}`);
        return;
      }
      if (!res.ok) throw new Error(`GET /api/me: ${res.status}`);
      const me = (await res.json()) as Me;
      if (!ignore) {
        setState(
          me.role !== "guest" || me.consented ? "consented" : "required",
        );
      }
    })().catch(() => {
      if (!ignore) setState("error");
    });
    return () => {
      ignore = true;
    };
  }, [router, pathname]);

  if (state === "consented") return children;
  if (state === "loading") return <Spinner my="6" />;
  if (state === "error") {
    return (
      <Text role="alert" py="6">
        読み込めませんでした。画面を開き直してください。
      </Text>
    );
  }
  return (
    <>
      {/* ヘッダーは画面の端まで広げる（レイアウトの Container の px="4" を打ち消す。ほかの guest の画面と同じ） */}
      <Box mx="-4">
        <AppHeader title="個人情報の取り扱い" />
      </Box>
      <ConsentForm onConsented={() => setState("consented")} />
    </>
  );
}

function ConsentForm({ onConsented }: { onConsented: () => void }) {
  const [agreed, setAgreed] = useState(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function submit() {
    setPending(true);
    setFailed(false);
    try {
      const res = await fetch("/api/me/consent", { method: "POST" });
      if (!res.ok) throw new Error(`POST /api/me/consent: ${res.status}`);
      onConsented();
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <Stack gap="4" py="6" className={styles.form}>
      <div className={styles.consentBox}>
        落とし物の照合と受け渡しの連絡のために、メールアドレスと申請の内容を使います。
        技大祭の終了後、一定の期間がたったら削除します。くわしくは
        <NextLink href="/privacy">個人情報の取り扱い</NextLink>
        をご覧ください。
      </div>
      <Checkbox checked={agreed} onChange={setAgreed}>
        個人情報の取り扱いに同意する
      </Checkbox>
      <Button
        colorPalette="blue"
        disabled={!agreed}
        loading={pending}
        onClick={submit}
      >
        同意して進む
      </Button>
      {failed && (
        <Text role="alert" color="#b42318" fontSize="sm">
          同意を記録できませんでした。もう一度お試しください。
        </Text>
      )}
    </Stack>
  );
}
