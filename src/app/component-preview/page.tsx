import {
  Box,
  Container,
  Flex,
  Heading,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { AppHeader } from "@/components/AppHeader";
import { FoundItemCard } from "@/components/FoundItemCard";
import { FoundItemDetailFields } from "@/components/FoundItemDetailFields";
import { GuestBottomNav } from "@/components/GuestBottomNav";
import { LostReportCard } from "@/components/LostReportCard";
import { LostReportDetailFields } from "@/components/LostReportDetailFields";
import { PhotoGallery } from "@/components/PhotoGallery";
import { StatCard } from "@/components/StatCard";
import type { FoundItem } from "@/lib/schemas/found-item";
import type { LostReport } from "@/lib/schemas/lost-report";
import { ChatExample, InputExample } from "./InteractiveExamples";

export const metadata: Metadata = {
  title: "レビュー用コンポーネント展示 | オトシル",
  robots: { index: false, follow: false },
};

const sections = [
  { key: "layout", label: "レイアウト" },
  { key: "items", label: "一覧・詳細" },
  { key: "input", label: "入力" },
  { key: "chat", label: "チャット" },
] as const;

const photos = [
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABICAIAAACGBWc0AAAAj0lEQVR4nO3QMQ2AMAAAwWpCCHrqlZEZDzhg6cCnueQFfG5c96OPxu8H8QABAgQIUDhAgAABAhQOECBAgACFAwQIECBA4QABApQGOs7ZDxAgQIAAhQMECBAgQOEAAQIECFA4QIAAAQIUDhAgQNsCbR8gQIAAAQoHCBAgQIDCAQIECBCgcIAAAQIEKBwgQGu9BLRJutEQT/EAAAAASUVORK5CYII=",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABICAIAAACGBWc0AAAAkElEQVR4nO3QMQ2AMAAAwbpCEGaqDCe4YMABSwc+zSUv4HPjuS99NH4/iAcIECBAgMIBAgQIEKBwgAABAgQoHCBAgAABCgcIEKA00DyPfoAAAQIEKBwgQIAAAQoHCBAgQIDCAQIECBCgcIAAAdoWaPsAAQIECFA4QIAAAQIUDhAgQIAAhQMECBAgQOEAAVrrBXRFyup/A61VAAAAAElFTkSuQmCC",
].map((url, index) => ({
  id: String(index + 1),
  url,
  thumbUrl: url,
  alt: `見本画像 ${index + 1}`,
}));
const category = { id: 1, name: "電子機器" };
const sampleTime = "2026-09-19T13:35:00+09:00";
const found: FoundItem = {
  id: "demo-found",
  displayNumber: "拾-00042",
  status: "received",
  category,
  color: "navy",
  brand: null,
  foundPlace: "屋外ステージ付近",
  foundAt: sampleTime,
  isValuable: false,
  memo: "ケース付きのイヤホン",
  photos,
  registeredByEmail: "staff@example.invalid",
  canEdit: false,
  activeMatch: null,
  handover: null,
  createdAt: sampleTime,
};
const lost: LostReport = {
  id: "demo-report",
  displayNumber: "申-00118",
  status: "maybe_found",
  category,
  color: "navy",
  brand: null,
  lostPlace: "屋外ステージ付近",
  lostAt: sampleTime,
  note: "ケースに丸いシールがあります。",
  verified: false,
  pickup: null,
  cancel: null,
  createdAt: sampleTime,
};

function LayoutExample() {
  return (
    <Stack gap="4">
      <Text color="fg.muted" fontSize="sm">
        この展示内の管理画面リンクと来場者タブは、見た目の確認用です。
      </Text>
      <Stack gap="2">
        <Heading as="h3" size="sm">
          AppHeader / GuestBottomNav
        </Heading>
        <Box
          inert
          maxW="390px"
          borderWidth="1px"
          rounded="lg"
          overflow="hidden"
        >
          <AppHeader title="遺失物を申請" backHref="/component-preview" />
          <GuestBottomNav />
        </Box>
      </Stack>
      <Stack gap="2">
        <Heading as="h3" size="sm">
          AdminShell
        </Heading>
        <Box
          borderWidth="1px"
          rounded="lg"
          overflowX="auto"
          maxH="390px"
          tabIndex={0}
          aria-label="PC向けの管理画面見本"
        >
          <Box inert minW="560px" css={{ "& > *": { minHeight: "390px" } }}>
            <AdminShell email="admin@example.invalid" role="admin">
              <Stack gap="3">
                <Heading as="h4" size="md">
                  ダッシュボード
                </Heading>
                <StatCard label="拾得物数" value={42} />
              </Stack>
            </AdminShell>
          </Box>
        </Box>
      </Stack>
    </Stack>
  );
}

function ItemsExample() {
  return (
    <SimpleGrid columns={{ base: 1, md: 2 }} gap="4" alignItems="start">
      <Stack gap="3">
        <FoundItemCard item={found} href="#found-details" />
        <LostReportCard report={lost} href="#lost-details" />
        <PhotoGallery photos={photos} />
      </Stack>
      <Stack gap="3">
        <Box id="found-details" p="4" bg="white" borderWidth="1px" rounded="lg">
          <Heading as="h3" size="sm">
            拾得物の詳細
          </Heading>
          <FoundItemDetailFields item={found} />
        </Box>
        <Box id="lost-details" p="4" bg="white" borderWidth="1px" rounded="lg">
          <Heading as="h3" size="sm">
            遺失物申請の詳細
          </Heading>
          <LostReportDetailFields report={lost} />
        </Box>
      </Stack>
    </SimpleGrid>
  );
}

export default async function Page({
  searchParams,
}: PageProps<"/component-preview">) {
  const deployment = process.env.VERCEL_ENV;
  if (
    deployment !== "preview" &&
    (deployment === "production" || process.env.NODE_ENV !== "development")
  ) {
    notFound();
  }

  const params = await searchParams;
  const section =
    sections.find(({ key }) => key === params.section) ?? sections[0];
  const thread = params.thread === "2" ? "2" : "1";

  return (
    <Box bg="gray.50" minH="100dvh">
      <Container maxW="6xl" px="4" py={{ base: "5", md: "8" }}>
        <Stack gap="5">
          <Stack as="header" gap="2">
            <Heading as="h1" size="xl">
              レビュー用コンポーネント展示
            </Heading>
            <Text color="fg.muted" fontSize="sm">
              仮データだけを使用します。操作した内容は保存されません。
            </Text>
          </Stack>
          <Flex as="nav" aria-label="展示の分類" wrap="wrap" gap="2">
            {sections.map(({ key, label }) => (
              <Box
                asChild
                key={key}
                px="3"
                py="2"
                rounded="md"
                fontSize="sm"
                bg={section.key === key ? "blue.50" : "white"}
                color={section.key === key ? "blue.700" : "fg"}
                fontWeight={section.key === key ? "bold" : "normal"}
                borderWidth="1px"
                borderColor={section.key === key ? "blue.400" : "gray.200"}
              >
                <Link
                  href={`/component-preview?section=${key}`}
                  aria-current={section.key === key ? "page" : undefined}
                >
                  {label}
                </Link>
              </Box>
            ))}
          </Flex>
          <Stack as="section" aria-labelledby="section-title" gap="3">
            <Heading id="section-title" as="h2" size="md">
              {section.label}
            </Heading>
            {section.key === "layout" && <LayoutExample />}
            {section.key === "items" && <ItemsExample />}
            {section.key === "input" && <InputExample />}
            {section.key === "chat" && <ChatExample activeThread={thread} />}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
