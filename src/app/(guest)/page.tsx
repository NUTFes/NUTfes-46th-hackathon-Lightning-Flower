import { Badge, Box, Flex, Heading, Stack, Text } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { HqLocationCard } from "@/components/HqLocationCard";
import { getGuest } from "@/lib/auth/guest";
import { GUEST_PROVIDERS } from "@/lib/auth/login";
import { safeNextPath } from "@/lib/auth/redirect";
import { HQ_LOCATION } from "@/lib/constants";
import { LoginConsentForm } from "./LoginConsentForm";

const providerNames = { google: "Google" } as const;

const features = [
  { title: "なくした物を申請", description: "特徴や場所・時間を登録" },
  { title: "実行委員とチャット", description: "見つかった候補を確認" },
  { title: "受け取り", description: "本人確認後に受け取り" },
];

// G01 トップ・ログイン前。
// ?next= はログインのあとに戻る先（src/proxy.ts がログインの要る画面から付ける）。
// ?error=login はログインに失敗して戻ってきたとき（/auth/login・/auth/callback が付ける）
export default async function Page({ searchParams }: PageProps<"/">) {
  const { next, error } = await searchParams;
  const nextPath = safeNextPath(typeof next === "string" ? next : null);

  // ログイン済みなら、そのまま戻る先へ（同意していなければ、その画面で同意を求める）
  if (await getGuest()) redirect(nextPath);

  return (
    <>
      {/* ヘッダーは画面の幅いっぱいに出す（レイアウトの Container の余白を打ち消す） */}
      <Box mx="-4">
        <AppHeader title="オトシル" />
      </Box>

      <Stack gap="6" py="5">
        <Stack gap="2" p="5" bg="blue.50" rounded="xl">
          <Heading as="h2" fontSize="2xl" lineHeight="short">
            なくしたものを、
            <br />
            いっしょに探そう。
          </Heading>
          <Text fontSize="sm" color="gray.600">
            技大祭の落とし物サポート
          </Text>
          <Text fontSize="xs" color="gray.500">
            写真照合ではなく、実行委員が確認します。
          </Text>
        </Stack>

        <Stack gap="3">
          {error === "login" && (
            <Text
              role="alert"
              px="3"
              py="2.5"
              rounded="md"
              bg="red.subtle"
              color="red.fg"
              fontSize="sm"
            >
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
        </Stack>

        <Stack as="section" gap="3">
          <Heading as="h2" fontSize="md">
            オトシルでできること
          </Heading>
          <Stack as="ol" gap="2" listStyleType="none">
            {features.map((feature, i) => (
              <Flex
                as="li"
                key={feature.title}
                align="center"
                gap="4"
                p="4"
                borderWidth="1px"
                borderColor="gray.200"
                rounded="lg"
                bg="white"
              >
                <Badge
                  colorPalette="blue"
                  variant="subtle"
                  rounded="full"
                  px="2.5"
                  flexShrink="0"
                >
                  {String(i + 1).padStart(2, "0")}
                </Badge>
                <Stack gap="0.5" minW="0">
                  <Text fontSize="sm" fontWeight="bold">
                    {feature.title}
                  </Text>
                  <Text fontSize="xs" color="gray.600">
                    {feature.description}
                  </Text>
                </Stack>
              </Flex>
            ))}
          </Stack>
        </Stack>

        <Text fontSize="sm" fontWeight="bold">
          ※落とし物を拾った方は、近くの実行委員にお渡しください
        </Text>

        <HqLocationCard name={HQ_LOCATION.name} note={HQ_LOCATION.note} />
      </Stack>
    </>
  );
}
