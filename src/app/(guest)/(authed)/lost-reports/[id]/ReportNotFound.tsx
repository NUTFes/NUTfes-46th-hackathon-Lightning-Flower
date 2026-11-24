import { Button } from "@chakra-ui/react";
import NextLink from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { FetchApiError } from "@/app/staff/fetch-api";

// 申請が見つからない（404）か、id の形が正しくない（400。URL を手で変えたなど）か。
// どちらも読み込み直しても変わらないので、再読み込みは出さずにホームへ戻ってもらう
export function isReportNotFound(error: unknown) {
  return (
    error instanceof FetchApiError &&
    (error.status === 404 || error.status === 400)
  );
}

// G05・G08 の「申請が見つかりません」（G06 と同じ形に、ホームへ戻るボタンを付ける）
export function ReportNotFound() {
  return (
    <EmptyState
      title="申請が見つかりません"
      description="ホームの「自分の申請」から開き直してください。"
      action={
        <Button asChild colorPalette="blue" size="sm">
          <NextLink href="/home">ホームへ戻る</NextLink>
        </Button>
      }
    />
  );
}
