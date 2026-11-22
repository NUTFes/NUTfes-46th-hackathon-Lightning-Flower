import type { Metadata } from "next";
import { Heading, Link, List, Stack, Text } from "@chakra-ui/react";

// プライバシーポリシー。Google の OAuth 同意画面（ブランディング）に URL を載せるため、ログインなしで開ける。
// 中身は Notion の設計仕様「DB設計」の「権限・個人情報」と合わせる（変えたらこちらも直す）
export const metadata: Metadata = {
  title: "プライバシーポリシー | オトシル",
};

export default function Page() {
  return (
    <Stack gap="6" py="6">
      <Heading size="xl">プライバシーポリシー</Heading>
      <Text>
        技大祭実行委員会（以下「実行委員会」）は、落とし物アプリ「オトシル」（以下「本サービス」）で扱う個人情報を、次のとおり取り扱います。
      </Text>

      <Stack gap="2">
        <Heading size="md">1. 集める情報</Heading>
        <List.Root ps="5">
          <List.Item>
            Google アカウントでログインしたときに Google
            から受け取る、メールアドレスと名前
          </List.Item>
          <List.Item>
            遺失物の申請で入力された内容（落とし物の種類・特徴・なくした場所と時間など）
          </List.Item>
          <List.Item>本部とのチャットで送られたメッセージ</List.Item>
          <List.Item>落とし物を受け取った人の名前（受け渡しの記録）</List.Item>
        </List.Root>
      </Stack>

      <Stack gap="2">
        <Heading size="md">2. 使う目的</Heading>
        <Text>
          集めた情報は、落とし物を持ち主に返すため（申請と拾得物の照合、本人確認、受け渡しの連絡）にだけ使います。それ以外の目的には使いません。
        </Text>
      </Stack>

      <Stack gap="2">
        <Heading size="md">3. 第三者への提供</Heading>
        <Text>
          法令に基づく場合を除き、本人の同意なく第三者に提供しません。
        </Text>
      </Stack>

      <Stack gap="2">
        <Heading size="md">4. 保管と削除</Heading>
        <Text>
          情報は、本サービスが使うクラウドサービス（Supabase・Vercel）に保管します。技大祭の最終日から
          30
          日を過ぎたら、アカウント・申請・チャット・受け取った人の名前を削除します。
        </Text>
      </Stack>

      <Stack gap="2">
        <Heading size="md">5. お問い合わせ</Heading>
        <Text>
          個人情報の確認・訂正・削除の依頼は、技大祭の本部（落とし物の窓口）か、次の連絡先までお知らせください。
        </Text>
        <Text>
          連絡先：
          <Link href="mailto:otoshiru.nutfes@gmail.com" colorPalette="blue">
            otoshiru.nutfes@gmail.com
          </Link>
        </Text>
      </Stack>

      <Text color="fg.muted" fontSize="sm">
        2026年11月22日 制定
      </Text>
    </Stack>
  );
}
