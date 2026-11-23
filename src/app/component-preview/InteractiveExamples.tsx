"use client";

import {
  Box,
  Button,
  Flex,
  Heading,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useState } from "react";
import type { ChatMessage } from "@/components/ChatBubble";
import { ChatComposer } from "@/components/ChatComposer";
import { ChatPanel } from "@/components/ChatPanel";
import { ChatThreadList } from "@/components/ChatThreadList";
import { Checkbox } from "@/components/Checkbox";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Field } from "@/components/Field";
import type { Photo } from "@/components/ItemThumbnail";
import { PhotoUploader } from "@/components/PhotoUploader";
import { Radio } from "@/components/Radio";
import { StatusBadge } from "@/components/StatusBadge";

const pickupOptions = [
  { value: "today", label: "今日取りに行く" },
  { value: "later", label: "後日取りに行く" },
];

export function InputExample() {
  const [checked, setChecked] = useState(false);
  const [pickup, setPickup] = useState("today");
  const [photos, setPhotos] = useState<(Photo | File)[]>([]);
  const [outcome, setOutcome] = useState("");

  return (
    <SimpleGrid columns={{ base: 1, md: 2 }} gap="4" alignItems="start">
      <Stack bg="white" borderWidth="1px" rounded="lg" p="4" gap="3">
        <Heading as="h3" size="sm">
          入力と選択
        </Heading>
        <Field label="ブランド" control={{ placeholder: "入力してください" }} />
        <Field
          kind="select"
          label="カテゴリ"
          control={{
            defaultValue: "electronics",
            children: (
              <>
                <option value="electronics">電子機器</option>
                <option value="wallet">財布</option>
              </>
            ),
          }}
        />
        <Field
          kind="textarea"
          label="メモ"
          control={{ placeholder: "拾得物について入力" }}
        />
        <Checkbox checked={checked} onChange={setChecked}>
          内容を確認しました
        </Checkbox>
        <Radio
          name="preview-pickup"
          label="受け取り方法"
          options={pickupOptions}
          value={pickup}
          onChange={setPickup}
        />
      </Stack>
      <Stack bg="white" borderWidth="1px" rounded="lg" p="4" gap="4">
        <PhotoUploader
          value={photos}
          onChange={setPhotos}
          max={2}
          required={false}
          requiredHint="画像を2枚まで選択できます。"
        />
        <Box>
          <ConfirmDialog
            trigger={
              <Button colorPalette="blue" onClick={() => setOutcome("")}>
                確認を開く
              </Button>
            }
            title="入力内容を確定しますか？"
            description="確定の動作を試せます。入力内容は送信されません。"
            confirmLabel="確定する"
            colorPalette="blue"
            action={async () => {
              setOutcome("確定しました。");
              return { ok: true };
            }}
            onCancel={() => setOutcome("キャンセルしました。")}
          />
          {outcome && (
            <Text role="status" color="fg.muted" fontSize="sm" mt="2">
              {outcome}
            </Text>
          )}
        </Box>
      </Stack>
    </SimpleGrid>
  );
}

const threads = [
  {
    reportId: "1",
    reportNumber: "申-00118",
    title: "紺色のイヤホン",
    awaitingReply: true,
  },
  {
    reportId: "2",
    reportNumber: "申-00119",
    title: "財布",
    awaitingReply: false,
  },
];
const messages: ChatMessage[] = [
  {
    id: "demo-1",
    senderRole: "admin",
    body: "似た落とし物が見つかりました。\nケースにシールは貼ってありますか？",
    createdAt: "2026-09-19T04:40:00Z",
  },
  {
    id: "demo-2",
    senderRole: "guest",
    body: "青い丸いシールが貼ってあります。",
    createdAt: "2026-09-19T04:44:00Z",
  },
];

export function ChatExample({ activeThread }: { activeThread: "1" | "2" }) {
  const [viewer, setViewer] = useState<"guest" | "admin">("guest");
  const [lastMessage, setLastMessage] = useState("");
  const thread = activeThread === "1" ? threads[0] : threads[1];

  return (
    <Stack gap="3">
      <Flex justify="space-between" align="center" gap="2" wrap="wrap">
        <Text color="fg.muted" fontSize="sm">
          表示する視点を切り替えられます。
        </Text>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setViewer(viewer === "guest" ? "admin" : "guest")}
        >
          {viewer === "guest"
            ? "本部側の表示に切り替える"
            : "来場者側の表示に切り替える"}
        </Button>
      </Flex>
      <Flex direction={{ base: "column", md: "row" }} align="stretch" gap="3">
        <Box w={{ base: "full", md: "257px" }} flexShrink={0}>
          <ChatThreadList
            threads={threads}
            activeReportId={activeThread}
            hrefBase="/component-preview"
            getThreadHref={(id) =>
              `/component-preview?section=chat&thread=${id}`
            }
          />
        </Box>
        <Box
          flex={{ md: "1" }}
          h={{ base: "310px", md: "370px" }}
          minW="0"
          borderWidth={{ base: "1px", md: "0" }}
          rounded="lg"
          overflow="hidden"
        >
          <ChatPanel
            reportId={activeThread}
            viewer={viewer}
            initialMessages={activeThread === "1" ? messages : []}
            canSend
            header={
              <Flex
                align="center"
                justify="space-between"
                gap="2"
                px="4"
                py="3"
              >
                <Text fontSize="sm" fontWeight="bold">
                  {thread.reportNumber}
                </Text>
                <StatusBadge
                  kind="lost"
                  status={activeThread === "1" ? "maybe_found" : "searching"}
                />
              </Flex>
            }
            sendAction={async (_reportId, body) => ({
              ok: true,
              message: {
                id: crypto.randomUUID(),
                senderRole: viewer,
                body,
                createdAt: new Date().toISOString(),
              },
            })}
          />
        </Box>
      </Flex>
      <Stack bg="white" borderWidth="1px" rounded="lg" p="3" gap="2">
        <Heading as="h3" size="sm">
          ChatComposer 単体
        </Heading>
        <ChatComposer
          placeholder="単体の入力欄を試す"
          onSend={async (body) => setLastMessage(body)}
        />
        {lastMessage && (
          <Text role="status" fontSize="sm" overflowWrap="anywhere">
            送信例: {lastMessage}
          </Text>
        )}
      </Stack>
    </Stack>
  );
}
