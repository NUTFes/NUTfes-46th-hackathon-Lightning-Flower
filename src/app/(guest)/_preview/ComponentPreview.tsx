"use client";

// TODO: 動作確認用の仮の画面。G01 を作るときに、このフォルダごと消す。
// 部品に渡す action は、本物の Server Action の代わりに、受け取った値を下のログに出すだけの関数にしている。
// 「action を失敗させる」に印を付けると、失敗のときの表示（message・fieldErrors）を確かめられる

import { Box, Button, Checkbox, Heading, Stack, Text } from "@chakra-ui/react";
import { type ReactNode, useState } from "react";
import { CancelReportForm } from "@/components/forms/CancelReportForm";
import { FoundItemForm } from "@/components/forms/FoundItemForm";
import { LoginConsentForm } from "@/components/forms/LoginConsentForm";
import { LostReportForm } from "@/components/forms/LostReportForm";
import { PickupMethodForm } from "@/components/forms/PickupMethodForm";
import { ChoiceCardGroup } from "@/components/ui/ChoiceCardGroup";
import { ColorLabel } from "@/components/ui/ColorLabel";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FoundItemCard } from "@/components/ui/FoundItemCard";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { LostReportDetailFields } from "@/components/ui/LostReportDetailFields";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AccountInfoCard } from "@/components/ui/admin/AccountInfoCard";
import { BroadcastMessageDialog } from "@/components/ui/admin/BroadcastMessageDialog";
import { ExpiryProcessor } from "@/components/ui/admin/ExpiryProcessor";
import { FoundItemTable } from "@/components/ui/admin/FoundItemTable";
import { HandoverForm } from "@/components/ui/admin/HandoverForm";
import { LostReportTable } from "@/components/ui/admin/LostReportTable";
import { MatchingBoard } from "@/components/ui/admin/MatchingBoard";
import { PendingReportsList } from "@/components/ui/admin/PendingReportsList";
import { StatusChangePanel } from "@/components/ui/admin/StatusChangePanel";
import { FOUND_STATUSES, ITEM_COLORS, LOST_STATUSES } from "@/db/enums";
import type { ActionResult } from "@/lib/action-result";
import type { Category } from "@/lib/schemas/category";
import type { LostReport, LostReportForAdmin } from "@/lib/schemas/lost-report";
import type { FoundItemSummary } from "@/lib/types";

// --- 仮のデータ ----------------------------------------------------------------

const CATEGORIES: Category[] = [
  { id: 1, name: "証明書・カード・定期券類", isValuableDefault: true },
  { id: 2, name: "財布", isValuableDefault: true },
  { id: 3, name: "スマートフォン", isValuableDefault: true },
  { id: 4, name: "傘", isValuableDefault: false },
];

// 写真の代わりの画像（外の通信をしないように data URI にする）
function samplePhoto(fill: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect width="100%" height="100%" fill="${fill}"/><text x="50%" y="50%" font-size="28" text-anchor="middle" fill="#fff" dy=".35em">sample</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const FOUND_ITEMS: FoundItemSummary[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    displayNumber: "拾-00042",
    status: "received",
    category: { id: 2, name: "財布" },
    color: "navy",
    brand: "PORTER",
    foundPlace: "模擬店エリア",
    foundAt: "2026-09-19T04:35:00.000Z",
    isValuable: true,
    photos: [
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        url: "",
        thumbUrl: samplePhoto("#1a237e"),
      },
    ],
    registeredByEmail: "member@example.com",
    activeMatch: null,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    displayNumber: "拾-00043",
    status: "matching",
    category: { id: 2, name: "財布" },
    color: "brown",
    brand: null,
    foundPlace: "体育館",
    foundAt: "2026-09-19T06:10:00.000Z",
    isValuable: true,
    photos: [],
    registeredByEmail: "member@example.com",
    activeMatch: {
      lostReportId: "33333333-3333-4333-8333-333333333333",
      displayNumber: "申-00118",
    },
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    displayNumber: "拾-00044",
    status: "received",
    category: { id: 4, name: "傘" },
    color: "clear",
    brand: null,
    foundPlace: "正門付近",
    foundAt: "2026-09-20T01:00:00.000Z",
    isValuable: false,
    photos: [
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        url: "",
        thumbUrl: samplePhoto("#9e9e9e"),
      },
    ],
    registeredByEmail: "other@example.com",
    activeMatch: null,
  },
];

const LOST_REPORT: LostReport = {
  id: "33333333-3333-4333-8333-333333333333",
  displayNumber: "申-00118",
  status: "maybe_found",
  category: { id: 2, name: "財布" },
  color: "brown",
  brand: "不明",
  lostPlace: "体育館の入口あたり",
  lostAt: "2026-09-19T05:30:00.000Z",
  note: "小銭入れが付いた二つ折りの財布です",
  verified: false,
  pickup: null,
  cancel: null,
  createdAt: "2026-09-19T07:00:00.000Z",
};

const LOST_REPORTS_FOR_ADMIN: LostReportForAdmin[] = [
  {
    ...LOST_REPORT,
    guest: { email: "guest@example.com", displayName: "技大 太郎" },
    activeMatch: {
      foundItemId: "22222222-2222-4222-8222-222222222222",
      displayNumber: "拾-00043",
    },
    awaitingReply: true,
  },
  {
    ...LOST_REPORT,
    id: "55555555-5555-4555-8555-555555555555",
    displayNumber: "申-00119",
    status: "searching",
    category: { id: 3, name: "スマートフォン" },
    color: "black",
    brand: "iPhone",
    lostPlace: "食堂",
    guest: { email: "guest2@example.com", displayName: null },
    activeMatch: null,
    awaitingReply: false,
  },
];

// --- 仮の action -----------------------------------------------------------------

type LogEntry = { at: string; name: string; payload: unknown };

function useMockActions() {
  const [log, setLog] = useState<LogEntry[]>([]);
  const [fail, setFail] = useState(false);

  function mock<A extends unknown[], T = undefined>(
    name: string,
    data?: T,
  ): (...args: A) => Promise<ActionResult<T>> {
    return async (...args: A) => {
      setLog((prev) => [
        {
          at: new Date().toLocaleTimeString("ja-JP"),
          name,
          payload: args.length === 1 ? args[0] : args,
        },
        ...prev,
      ]);
      // 送信中の表示を確かめられるように、少し待つ
      await new Promise((resolve) => setTimeout(resolve, 600));
      if (fail) {
        return {
          ok: false,
          message: `${name} が失敗しました（動作確認用）`,
          fieldErrors: { foundPlace: "場所を選んでください（動作確認用）" },
        };
      }
      return { ok: true, data: data as T };
    };
  }

  return { log, setLog, fail, setFail, mock };
}

// File は JSON にできないので、名前だけにする
function stringify(value: unknown) {
  return JSON.stringify(
    value,
    (_key, v) =>
      v instanceof File ? `File(${v.name}, ${v.size} bytes)` : (v as unknown),
    2,
  );
}

// --- 画面 ------------------------------------------------------------------------

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <Box as="section" borderWidth="1px" borderRadius="md" p="4">
      <Heading size="md" mb="1">
        {title}
      </Heading>
      {note && (
        <Text fontSize="sm" color="fg.muted" mb="3">
          {note}
        </Text>
      )}
      <Stack gap="3">{children}</Stack>
    </Box>
  );
}

export function ComponentPreview() {
  const { log, setLog, fail, setFail, mock } = useMockActions();
  const [choice, setChoice] = useState<"a" | "b" | "c" | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [destructiveOpen, setDestructiveOpen] = useState(false);
  const [selectedFound, setSelectedFound] = useState<string[]>([]);
  const [selectedLost, setSelectedLost] = useState<string[]>([]);

  return (
    <Stack gap="6" py="6">
      <Stack gap="1">
        <Heading size="xl">部品の動作確認（G01 の仮の画面）</Heading>
        <Text fontSize="sm" color="fg.muted">
          action は本物の Server Action
          ではなく、受け取った値を下のログに出すだけです。
        </Text>
      </Stack>

      <Box
        position="sticky"
        top="0"
        zIndex="docked"
        bg="bg"
        borderWidth="1px"
        borderRadius="md"
        p="3"
      >
        <Checkbox.Root
          checked={fail}
          onCheckedChange={(details) => setFail(details.checked === true)}
        >
          <Checkbox.HiddenInput />
          <Checkbox.Control />
          <Checkbox.Label>action を失敗させる</Checkbox.Label>
        </Checkbox.Root>
        <Stack direction="row" justify="space-between" align="center" mt="2">
          <Text fontWeight="bold" fontSize="sm">
            action のログ（新しい順）
          </Text>
          <Button size="xs" variant="outline" onClick={() => setLog([])}>
            消す
          </Button>
        </Stack>
        <Box
          as="pre"
          fontSize="xs"
          maxH="40"
          overflow="auto"
          bg="bg.muted"
          p="2"
          mt="1"
          borderRadius="sm"
        >
          {log.length === 0
            ? "（まだ呼ばれていません）"
            : log
                .map((e) => `[${e.at}] ${e.name}\n${stringify(e.payload)}`)
                .join("\n\n")}
        </Box>
      </Box>

      {/* --- 表示だけの部品 --- */}

      <Section title="StatusBadge（拾得物）">
        <Stack direction="row" wrap="wrap" gap="2">
          {FOUND_STATUSES.map((status) => (
            <StatusBadge key={status} kind="found" status={status} />
          ))}
        </Stack>
      </Section>

      <Section title="StatusBadge（遺失物申請）">
        <Stack direction="row" wrap="wrap" gap="2">
          {LOST_STATUSES.map((status) => (
            <StatusBadge key={status} kind="lost" status={status} />
          ))}
        </Stack>
      </Section>

      <Section title="ColorLabel">
        <Stack direction="row" wrap="wrap" gap="3">
          {ITEM_COLORS.map((color) => (
            <ColorLabel key={color} color={color} />
          ))}
        </Stack>
      </Section>

      <Section title="ChoiceCardGroup">
        <ChoiceCardGroup
          name="preview-choice"
          label="どれか 1 つ選ぶ"
          options={[
            { value: "a", label: "選択肢 A", description: "説明つき" },
            { value: "b", label: "選択肢 B" },
            { value: "c", label: "選択肢 C" },
          ]}
          value={choice}
          onChange={setChoice}
          invalid={choice === null}
        />
        <Text fontSize="sm">選んだ値：{choice ?? "（なし）"}</Text>
      </Section>

      <Section title="ConfirmDialog">
        <Stack direction="row" gap="2">
          <Button onClick={() => setConfirmOpen(true)}>ふつう</Button>
          <Button colorPalette="red" onClick={() => setDestructiveOpen(true)}>
            destructive
          </Button>
        </Stack>
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="保存しますか？"
          description="動作確認用のダイアログです。"
          onConfirm={() => setConfirmOpen(false)}
        />
        <ConfirmDialog
          open={destructiveOpen}
          onOpenChange={setDestructiveOpen}
          title="削除しますか？"
          description="この操作は取り消せません（動作確認用）。"
          confirmLabel="削除する"
          destructive
          onConfirm={() => setDestructiveOpen(false)}
        />
      </Section>

      <Section title="FoundItemCard">
        <FoundItemCard item={FOUND_ITEMS[0]} href="#" />
        <FoundItemCard
          item={FOUND_ITEMS[1]}
          highlighted
          actions={<Button size="sm">ボタン（actions）</Button>}
        />
      </Section>

      <Section title="LostReportDetailFields">
        <LostReportDetailFields report={LOST_REPORT} />
      </Section>

      <Section
        title="LogoutButton"
        note="押すと /cdn-cgi/access/logout へ移動します"
      >
        <LogoutButton />
      </Section>

      {/* --- フォーム（guest / member） --- */}

      <Section
        title="LoginConsentForm（G01）"
        note="ボタンは /auth/login へのリンクです"
      >
        <LoginConsentForm
          providers={[
            { id: "google", name: "Google" },
            { id: "github", name: "GitHub" },
          ]}
          callbackUrl="/home"
        />
      </Section>

      <Section title="LostReportForm（新規）">
        <LostReportForm
          mode="create"
          categories={CATEGORIES}
          action={mock("LostReportForm.create", { id: LOST_REPORT.id })}
          submitLabel="申請する"
        />
      </Section>

      <Section title="LostReportForm（編集）">
        <LostReportForm
          mode="edit"
          categories={CATEGORIES}
          defaultValues={LOST_REPORT}
          action={mock("LostReportForm.edit", { id: LOST_REPORT.id })}
          submitLabel="保存する"
        />
      </Section>

      <Section title="PickupMethodForm（G07）">
        <PickupMethodForm
          reportId={LOST_REPORT.id}
          action={mock("PickupMethodForm")}
        />
      </Section>

      <Section title="CancelReportForm（G08）">
        <CancelReportForm
          reportId={LOST_REPORT.id}
          action={mock("CancelReportForm")}
        />
      </Section>

      <Section title="FoundItemForm（新規）">
        <FoundItemForm
          mode="create"
          categories={CATEGORIES}
          action={mock("FoundItemForm.create", { id: FOUND_ITEMS[0].id })}
          submitLabel="登録する"
        />
      </Section>

      <Section title="FoundItemForm（編集）">
        <FoundItemForm
          mode="edit"
          categories={CATEGORIES}
          defaultValues={{ ...FOUND_ITEMS[0], memo: "動作確認用のメモ" }}
          action={mock("FoundItemForm.edit", { id: FOUND_ITEMS[0].id })}
          submitLabel="保存する"
        />
      </Section>

      {/* --- admin --- */}

      <Section title="AccountInfoCard">
        <AccountInfoCard
          email="admin@example.com"
          role="admin"
          authProvider="Cloudflare Access"
        />
      </Section>

      <Section title="PendingReportsList">
        <PendingReportsList
          rows={[
            {
              reportId: LOST_REPORT.id,
              number: "申-00118",
              category: { id: 2, name: "財布" },
              reason: "awaiting_reply",
            },
            {
              reportId: "55555555-5555-4555-8555-555555555555",
              number: "申-00119",
              category: { id: 3, name: "スマートフォン" },
              reason: "verifying",
            },
            {
              reportId: "66666666-6666-4666-8666-666666666666",
              number: "申-00120",
              category: { id: 4, name: "傘" },
              reason: "searching",
            },
          ]}
        />
      </Section>

      <Section title="FoundItemTable（選択あり）">
        <FoundItemTable
          rows={FOUND_ITEMS}
          selectable
          selectedIds={selectedFound}
          onSelectionChange={setSelectedFound}
        />
        <Text fontSize="sm">
          選択中：{selectedFound.join(", ") || "（なし）"}
        </Text>
      </Section>

      <Section title="FoundItemTable（空）">
        <FoundItemTable rows={[]} emptyState="拾得物はありません" />
      </Section>

      <Section title="LostReportTable（選択あり）">
        <LostReportTable
          rows={LOST_REPORTS_FOR_ADMIN}
          selectable
          selectedIds={selectedLost}
          onSelectionChange={setSelectedLost}
        />
        <Text fontSize="sm">
          選択中：{selectedLost.join(", ") || "（なし）"}
        </Text>
      </Section>

      <Section title="StatusChangePanel">
        <StatusChangePanel
          itemId={FOUND_ITEMS[1].id}
          currentStatus="matching"
          linkedReport={{ id: LOST_REPORT.id, number: "申-00118" }}
          allowedNext={["received", "awaiting_handover"]}
          action={mock("StatusChangePanel")}
        />
      </Section>

      <Section title="HandoverForm（A03）">
        <HandoverForm
          itemId={FOUND_ITEMS[0].id}
          action={mock("HandoverForm")}
        />
      </Section>

      <Section title="MatchingBoard（A05）">
        <MatchingBoard
          report={LOST_REPORT}
          candidates={FOUND_ITEMS.filter((item) => item.category.id === 2)}
          linkedFoundItemId={FOUND_ITEMS[1].id}
          linkAction={mock("MatchingBoard.link")}
          unlinkAction={mock("MatchingBoard.unlink")}
          proceedToVerifyAction={mock("MatchingBoard.proceedToVerify")}
        />
      </Section>

      <Section title="BroadcastMessageDialog">
        <BroadcastMessageDialog
          recipientCount={12}
          action={mock("BroadcastMessageDialog")}
        />
      </Section>

      <Section title="ExpiryProcessor（A07）">
        <ExpiryProcessor
          valuableItems={FOUND_ITEMS.filter((item) => item.isValuable)}
          nonValuableItems={FOUND_ITEMS.filter((item) => !item.isValuable)}
          bulkUpdateAction={mock("ExpiryProcessor.bulkUpdate")}
          broadcastAction={mock("ExpiryProcessor.broadcast")}
          recipientCount={12}
        />
      </Section>
    </Stack>
  );
}
