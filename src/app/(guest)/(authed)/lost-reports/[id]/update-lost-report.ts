import { errorMessageOf, fetchApi, FetchApiError } from "@/app/staff/fetch-api";
import type { LostReportInput } from "@/lib/schemas/form-inputs";
import type {
  LostReport,
  LostReportPatchBody,
} from "@/lib/schemas/lost-report";

// 申請の入力情報の変更（PATCH /api/lost-reports/{id}）。G04（申請完了）と G05（申請状況）で使う。
// 変更できるのは探し中のあいだだけで、それ以外は API が 409 を返す。
// 401（ログインし直し）・409（状態が変わった）のときに画面をどうするかは、呼ぶ側で決める
export type UpdateLostReportResult =
  | { ok: true; report: LostReport }
  | {
      ok: false;
      reason: "unauthorized" | "conflict" | "other";
      error: string;
    };

export async function updateLostReport(
  id: string,
  input: LostReportInput,
): Promise<UpdateLostReportResult> {
  const body: LostReportPatchBody = {
    categoryId: input.categoryId,
    color: input.color,
    brand: input.brand,
    lostPlace: input.lostPlace,
    lostAt: input.lostAt,
    note: input.note,
  };
  try {
    const report = await fetchApi<LostReport>(
      `/api/lost-reports/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    return { ok: true, report };
  } catch (error) {
    if (error instanceof FetchApiError && error.status === 401) {
      return {
        ok: false,
        reason: "unauthorized",
        error: "ログインが切れました。ログインし直してください。",
      };
    }
    if (error instanceof FetchApiError && error.status === 409) {
      return {
        ok: false,
        reason: "conflict",
        error: "探し中ではなくなったため、変更できませんでした。",
      };
    }
    return { ok: false, reason: "other", error: errorMessageOf(error) };
  }
}
