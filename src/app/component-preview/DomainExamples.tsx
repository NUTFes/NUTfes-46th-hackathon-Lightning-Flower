"use client";

import {
  Box,
  Button,
  Code,
  Flex,
  Heading,
  Stack,
  Switch,
  Text,
} from "@chakra-ui/react";
import { useState, type ReactNode } from "react";
import { FoundItemForm } from "@/components/FoundItemForm";
import { FoundItemTable } from "@/components/FoundItemTable";
import { LostReportForm } from "@/components/LostReportForm";
import type { ActionResult } from "@/lib/action-result";
import type { Category } from "@/lib/schemas/category";
import type { FoundItem } from "@/lib/schemas/found-item";
import type { LostReport, LostReportForAdmin } from "@/lib/schemas/lost-report";
import { CancelReportForm } from "../(guest)/(authed)/lost-reports/[id]/cancel/CancelReportForm";
import { PickupMethodForm } from "../(guest)/(authed)/lost-reports/[id]/pickup/PickupMethodForm";
import { LoginConsentForm } from "../(guest)/LoginConsentForm";
import { PendingReportsList } from "../admin/PendingReportsList";
import { HandoverForm } from "../admin/found-items/[id]/HandoverForm";
import { StatusChangePanel } from "../admin/found-items/[id]/StatusChangePanel";
import { MatchingBoard } from "../admin/lost-reports/[id]/MatchingBoard";
import { LostReportTable } from "../admin/lost-reports/LostReportTable";
import { BroadcastMessageDialog } from "../admin/period-end/BroadcastMessageDialog";
import { ExpiryProcessor } from "../admin/period-end/ExpiryProcessor";
import { AccountInfoCard } from "../admin/settings/AccountInfoCard";

// --- 仮のデータ ----------------------------------------------------------------

const categories: Category[] = [
  { id: 1, name: "証明書・カード・定期券類", isValuableDefault: true },
  { id: 2, name: "財布類", isValuableDefault: true },
  { id: 3, name: "携帯電話類", isValuableDefault: true },
  { id: 10, name: "かさ類", isValuableDefault: false },
];

// 写真の代わりの画像（外の通信をしないように data URI にする）
function samplePhoto(fill: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect width="100%" height="100%" fill="${fill}"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const baseFound = {
  brand: null,
  memo: null,
  canEdit: true,
  handover: null,
  createdAt: "2026-09-19T05:00:00.000Z",
  registeredByEmail: "member@example.invalid",
  activeMatch: null,
} satisfies Partial<FoundItem>;

const foundItems: FoundItem[] = [
  {
    ...baseFound,
    id: "11111111-1111-4111-8111-111111111111",
    displayNumber: "拾-00042",
    status: "received",
    category: { id: 2, name: "財布類" },
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
  },
  {
    ...baseFound,
    id: "22222222-2222-4222-8222-222222222222",
    displayNumber: "拾-00043",
    status: "matching",
    category: { id: 2, name: "財布類" },
    color: "brown",
    foundPlace: "体育館",
    foundAt: "2026-09-19T06:10:00.000Z",
    isValuable: true,
    photos: [],
    activeMatch: {
      lostReportId: "33333333-3333-4333-8333-333333333333",
      displayNumber: "申-00118",
    },
  },
  {
    ...baseFound,
    id: "44444444-4444-4444-8444-444444444444",
    displayNumber: "拾-00044",
    status: "received",
    category: { id: 10, name: "かさ類" },
    color: "clear",
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
    registeredByEmail: "other@example.invalid",
  },
];

const lostReport: LostReport = {
  id: "33333333-3333-4333-8333-333333333333",
  displayNumber: "申-00118",
  status: "maybe_found",
  category: { id: 2, name: "財布類" },
  color: "brown",
  brand: null,
  lostPlace: "体育館の入口あたり",
  lostAt: "2026-09-19T05:30:00.000Z",
  note: "小銭入れが付いた二つ折りの財布です",
  verified: false,
  pickup: null,
  cancel: null,
  createdAt: "2026-09-19T07:00:00.000Z",
};

const lostReportsForAdmin: LostReportForAdmin[] = [
  {
    ...lostReport,
    guest: { email: "guest@example.invalid", displayName: "技大 太郎" },
    activeMatch: {
      foundItemId: "22222222-2222-4222-8222-222222222222",
      displayNumber: "拾-00043",
    },
    awaitingReply: true,
  },
  {
    ...lostReport,
    id: "55555555-5555-4555-8555-555555555555",
    displayNumber: "申-00119",
    status: "searching",
    category: { id: 3, name: "携帯電話類" },
    color: "black",
    lostPlace: "食堂",
    guest: { email: "guest2@example.invalid", displayName: null },
    activeMatch: null,
    awaitingReply: false,
  },
];

// --- 仮の action -----------------------------------------------------------------

type LogEntry = { at: string; name: string; payload: unknown };

// action は本物の Server Action ではなく、受け取った値をログに出すだけ
function useMockActions() {
  const [log, setLog] = useState<LogEntry[]>([]);
  const [fail, setFail] = useState(false);

  function mock<A extends unknown[], T = void>(name: string, data?: T) {
    return async (...args: A): Promise<ActionResult<T>> => {
      setLog((previous) => [
        {
          at: new Date().toLocaleTimeString("ja-JP"),
          name,
          payload: args.length === 1 ? args[0] : args,
        },
        ...previous,
      ]);
      // 送信中の表示を確かめられるように、少し待つ
      await new Promise((resolve) => setTimeout(resolve, 600));
      if (fail) {
        return { ok: false, error: `${name} が失敗しました（動作確認用）` };
      }
      return (
        data === undefined ? { ok: true } : { ok: true, data }
      ) as ActionResult<T>;
    };
  }

  // 写真のアップロードの代わり。ファイル名からパスを作る
  const uploadPhoto = async (
    file: File,
  ): Promise<ActionResult<{ path: string; thumbPath: string }>> => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const name = encodeURIComponent(file.name);
    return {
      ok: true,
      data: {
        path: `found/demo/${name}`,
        thumbPath: `found/demo/thumb-${name}`,
      },
    };
  };

  return { log, setLog, fail, setFail, mock, uploadPhoto };
}

// --- 画面 ------------------------------------------------------------------------

function Example({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack gap="2" p="4" bg="white" borderWidth="1px" rounded="lg">
      <Heading as="h3" size="sm">
        {title}
      </Heading>
      {children}
    </Stack>
  );
}

function MockControls({
  log,
  fail,
  onFailChange,
  onClear,
}: {
  log: LogEntry[];
  fail: boolean;
  onFailChange: (fail: boolean) => void;
  onClear: () => void;
}) {
  return (
    <Stack gap="2" p="4" bg="white" borderWidth="1px" rounded="lg">
      <Flex align="center" justify="space-between" gap="2" wrap="wrap">
        <Switch.Root
          checked={fail}
          onCheckedChange={(details) => onFailChange(details.checked)}
        >
          <Switch.HiddenInput />
          <Switch.Control />
          <Switch.Label>action を失敗させる</Switch.Label>
        </Switch.Root>
        <Button size="xs" variant="outline" onClick={onClear}>
          ログを消す
        </Button>
      </Flex>
      <Text fontSize="xs" color="fg.muted">
        action に渡された値（新しい順）
      </Text>
      <Box maxH="200px" overflow="auto">
        {log.length === 0 ? (
          <Text fontSize="sm">（まだありません）</Text>
        ) : (
          log.map((entry, index) => (
            <Code key={index} display="block" whiteSpace="pre-wrap" mb="2">
              {`${entry.at} ${entry.name}\n${JSON.stringify(entry.payload, null, 2)}`}
            </Code>
          ))
        )}
      </Box>
    </Stack>
  );
}

export function FormExample() {
  const { log, setLog, fail, setFail, mock, uploadPhoto } = useMockActions();

  return (
    <Stack gap="4" maxW="480px">
      <MockControls
        log={log}
        fail={fail}
        onFailChange={setFail}
        onClear={() => setLog([])}
      />
      <Example title="LoginConsentForm（G01）">
        <LoginConsentForm
          providers={[{ id: "google", name: "Google" }]}
          callbackUrl="/home"
        />
      </Example>
      <Example title="LostReportForm（新規）">
        <LostReportForm
          mode="create"
          categories={categories}
          action={mock("LostReportForm.create", { id: lostReport.id })}
          submitLabel="申請する"
        />
      </Example>
      <Example title="LostReportForm（編集）">
        <LostReportForm
          mode="edit"
          categories={categories}
          defaultValues={lostReport}
          action={mock("LostReportForm.edit", { id: lostReport.id })}
          submitLabel="保存する"
        />
      </Example>
      <Example title="PickupMethodForm（G07）">
        <PickupMethodForm
          reportId={lostReport.id}
          action={mock("PickupMethodForm")}
        />
      </Example>
      <Example title="CancelReportForm（G08）">
        <CancelReportForm
          reportId={lostReport.id}
          action={mock("CancelReportForm")}
        />
      </Example>
      <Example title="FoundItemForm（新規）">
        <FoundItemForm
          mode="create"
          categories={categories}
          uploadPhoto={uploadPhoto}
          action={mock("FoundItemForm.create", { id: foundItems[0].id })}
          submitLabel="登録する"
        />
      </Example>
      <Example title="FoundItemForm（編集）">
        <FoundItemForm
          mode="edit"
          categories={categories}
          defaultValues={foundItems[0]}
          uploadPhoto={uploadPhoto}
          action={mock("FoundItemForm.edit", { id: foundItems[0].id })}
          submitLabel="保存する"
        />
      </Example>
    </Stack>
  );
}

export function AdminExample() {
  const { log, setLog, fail, setFail, mock } = useMockActions();
  const [selectedFound, setSelectedFound] = useState<string[]>([]);
  const [selectedLost, setSelectedLost] = useState<string[]>([]);

  return (
    <Stack gap="4">
      <MockControls
        log={log}
        fail={fail}
        onFailChange={setFail}
        onClear={() => setLog([])}
      />
      <Example title="AccountInfoCard（A08）">
        <AccountInfoCard
          email="admin@example.invalid"
          role="admin"
          authProvider="Cloudflare Access"
        />
      </Example>
      <Example title="PendingReportsList（A01）">
        <PendingReportsList
          rows={[
            {
              reportId: lostReport.id,
              number: "申-00118",
              category: { id: 2, name: "財布類" },
              reason: "awaiting_reply",
            },
            {
              reportId: "55555555-5555-4555-8555-555555555555",
              number: "申-00119",
              category: { id: 3, name: "携帯電話類" },
              reason: "verifying",
            },
            {
              reportId: "66666666-6666-4666-8666-666666666666",
              number: "申-00120",
              category: { id: 10, name: "かさ類" },
              reason: "searching",
            },
          ]}
        />
      </Example>
      <Example title="FoundItemTable（選択あり）">
        <FoundItemTable
          rows={foundItems}
          selectable
          selectedIds={selectedFound}
          onSelectionChange={setSelectedFound}
        />
        <Text fontSize="sm">
          選択中：{selectedFound.join(", ") || "（なし）"}
        </Text>
      </Example>
      <Example title="FoundItemTable（空）">
        <FoundItemTable rows={[]} />
      </Example>
      <Example title="LostReportTable（A04）">
        <LostReportTable
          rows={lostReportsForAdmin}
          selectable
          selectedIds={selectedLost}
          onSelectionChange={setSelectedLost}
        />
      </Example>
      <Example title="StatusChangePanel（A03）">
        <StatusChangePanel
          itemId={foundItems[1].id}
          currentStatus="matching"
          linkedReport={foundItems[1].activeMatch}
          allowedNext={["received", "awaiting_handover", "resolved"]}
          action={mock("StatusChangePanel")}
        />
      </Example>
      <Example title="HandoverForm（A03）">
        <HandoverForm itemId={foundItems[0].id} action={mock("HandoverForm")} />
      </Example>
      <Example title="MatchingBoard（A05）">
        <MatchingBoard
          report={lostReport}
          candidates={foundItems.filter((item) => item.category.id === 2)}
          linkedFoundItemId={foundItems[1].id}
          linkAction={mock("MatchingBoard.link")}
          unlinkAction={mock("MatchingBoard.unlink")}
          proceedToVerifyAction={mock("MatchingBoard.proceedToVerify")}
        />
      </Example>
      <Example title="BroadcastMessageDialog（A07）">
        <BroadcastMessageDialog
          recipientCount={12}
          action={mock("BroadcastMessageDialog")}
        />
      </Example>
      <Example title="ExpiryProcessor（A07）">
        <ExpiryProcessor
          valuableItems={foundItems.filter((item) => item.isValuable)}
          nonValuableItems={foundItems.filter((item) => !item.isValuable)}
          bulkUpdateAction={mock("ExpiryProcessor.bulkUpdate")}
          broadcastAction={mock("ExpiryProcessor.broadcast")}
          recipientCount={12}
        />
      </Example>
    </Stack>
  );
}
