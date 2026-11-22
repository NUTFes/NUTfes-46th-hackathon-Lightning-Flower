import { Badge, Heading, Stack, Text } from "@chakra-ui/react";

// まだ作っていない画面の仮の表示。画面を作るときに、この部品ごと置き換える。
// code は Figma「オトシル 画面構成」の画面記号（M01・A03・G05 など）
export function ScreenPlaceholder({
  code,
  title,
}: {
  code: string;
  title: string;
}) {
  return (
    <Stack gap="3" py="6">
      <Badge alignSelf="flex-start" colorPalette="gray">
        {code}
      </Badge>
      <Heading size="xl">{title}</Heading>
      <Text color="fg.muted">この画面はまだ作っていません。</Text>
    </Stack>
  );
}
