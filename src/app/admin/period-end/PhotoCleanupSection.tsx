"use client";

import { Button, Flex, Heading, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { ActionResult } from "@/lib/action-result";

const numberFormat = new Intl.NumberFormat("ja-JP");

// 使われていない写真のファイルをまとめて消す（A07）。
// action は消したファイルの数を返す（何度押しても、消えるのは使われていないファイルだけ）
export function PhotoCleanupSection({
  action,
}: {
  action: () => Promise<ActionResult<{ deleted: number }>>;
}) {
  const [notice, setNotice] = useState<string | null>(null);

  async function cleanup(): Promise<ActionResult> {
    setNotice(null);
    const result = await action();
    if (!result.ok) return result;
    const { deleted } = result.data;
    setNotice(
      deleted === 0
        ? "消すファイルはありませんでした"
        : `${numberFormat.format(deleted)} 件のファイル（写真 1 枚につき、元の画像とサムネイルの 2 件）を消しました`,
    );
    return { ok: true };
  }

  return (
    <Stack
      as="section"
      aria-labelledby="photo-cleanup-heading"
      gap="3"
      p="5"
      bg="white"
      borderWidth="1px"
      borderColor="gray.200"
      rounded="xl"
    >
      <Heading as="h2" size="md" id="photo-cleanup-heading">
        使われていない写真を消す
      </Heading>
      <Text fontSize="sm" color="fg.muted">
        登録をやめた・写真を差し替えたなどで、どの拾得物にも使われていない写真のファイルを
        Storage から消します。上げてから 1
        日たっていないファイルは、登録の途中かもしれないので消しません。
      </Text>
      <Flex align="center" gap="3" wrap="wrap">
        <ConfirmDialog
          trigger={
            <Button variant="outline" colorPalette="red">
              使われていない写真を消す
            </Button>
          }
          title="使われていない写真のファイルを消しますか？"
          description="消したファイルは元に戻せません。拾得物に付いている写真は消えません。"
          confirmLabel="消す"
          colorPalette="red"
          action={cleanup}
        />
        {notice && (
          <Text role="status" fontSize="sm" color="green.fg">
            {notice}
          </Text>
        )}
      </Flex>
    </Stack>
  );
}
