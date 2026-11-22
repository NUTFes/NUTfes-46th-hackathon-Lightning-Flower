import type { Metadata } from "next";
import { Heading, List, Link, Stack, Text } from "@chakra-ui/react";
import NextLink from "next/link";

// 利用規約。Google の OAuth 同意画面（ブランディング）に URL を載せるため、ログインなしで開ける
export const metadata: Metadata = {
  title: "利用規約 | オトシル",
};

export default function Page() {
  return (
    <Stack gap="6" py="6">
      <Heading size="xl">利用規約</Heading>
      <Text>
        この規約は、技大祭実行委員会（以下「実行委員会」）が提供する落とし物アプリ「オトシル」（以下「本サービス」）の使い方を定めるものです。本サービスを使った人は、この規約に同意したものとします。
      </Text>

      <Stack gap="2">
        <Heading size="md">1. 本サービスでできること</Heading>
        <Text>
          技大祭の会場でなくした物を申請し、本部とチャットでやりとりして、見つかった落とし物を受け取ることができます。
        </Text>
      </Stack>

      <Stack gap="2">
        <Heading size="md">2. してはいけないこと</Heading>
        <List.Root ps="5">
          <List.Item>自分の物ではない落とし物を申請すること</List.Item>
          <List.Item>うその内容を申請・送信すること</List.Item>
          <List.Item>
            本部の実行委員や、ほかの人を困らせるメッセージを送ること
          </List.Item>
          <List.Item>本サービスの動作を妨げること</List.Item>
        </List.Root>
        <Text>
          これらに当たると実行委員会が判断したときは、申請を取り消したり、本サービスを使えなくしたりすることがあります。
        </Text>
      </Stack>

      <Stack gap="2">
        <Heading size="md">3. 落とし物の受け取り</Heading>
        <Text>
          落とし物は、本部で本人確認をしてからお渡しします。技大祭が終わっても持ち主が見つからなかった落とし物は、警察に届けるか処分します。
        </Text>
      </Stack>

      <Stack gap="2">
        <Heading size="md">4. 免責</Heading>
        <Text>
          実行委員会は、落とし物が必ず見つかることを約束しません。本サービスは予告なく止めたり、内容を変えたりすることがあります。
        </Text>
      </Stack>

      <Stack gap="2">
        <Heading size="md">5. 個人情報</Heading>
        <Text>
          個人情報は
          <Link asChild colorPalette="blue">
            <NextLink href="/privacy">プライバシーポリシー</NextLink>
          </Link>
          のとおり取り扱います。
        </Text>
      </Stack>

      <Text color="fg.muted" fontSize="sm">
        2026年11月22日 制定
      </Text>
    </Stack>
  );
}
