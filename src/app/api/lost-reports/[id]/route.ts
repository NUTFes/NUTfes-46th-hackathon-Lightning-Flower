import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { categories, lostReports } from "@/db/schema";
import { requireActor, requireGuest } from "@/lib/api/auth";
import { badRequest, conflict, forbidden, notFound } from "@/lib/api/errors";
import { apiHandler } from "@/lib/api/handler";
import { parseBody, parseParams } from "@/lib/api/parse";
import {
  lostReportForAdminWith,
  lostReportWith,
} from "@/lib/queries/lost-reports";
import {
  type LostReport,
  type LostReportForAdmin,
  LostReportIdParams,
  LostReportPatchBody,
} from "@/lib/schemas/lost-report";
import {
  toLostReport,
  toLostReportForAdmin,
} from "@/lib/serializers/lost-report";

type ParamsContext = { params: Promise<unknown> };

// 遺失物申請の詳細・申請状況（guest は自分の申請だけ / admin）。画面：G05・A05
export const GET = apiHandler(async (request, ctx) => {
  // 1. 権限を確かめる（guest と admin のみ許可、member は 403）
  const actor = await requireActor(request);
  if (actor.role === "member") {
    throw forbidden();
  }

  // 2. 入力を確かめる（URL の id が uuid かチェック）
  const { id } = parseParams(
    await (ctx as ParamsContext).params,
    LostReportIdParams,
  );

  // 3. DB から取る
  const db = getDb();
  if (actor.role === "admin") {
    const row = await db.query.lostReports.findFirst({
      where: eq(lostReports.id, id),
      with: lostReportForAdminWith,
    });
    if (!row) {
      throw notFound("遺失物申請が見つかりません");
    }

    // 4. 共通の形にして返す（admin 用：guest・activeMatch・awaitingReply を含む）
    return Response.json(
      toLostReportForAdmin(row) satisfies LostReportForAdmin,
    );
  }

  // TypeScript に actor が guest であることを確定させる
  if (actor.role !== "guest") {
    throw forbidden();
  }

  // guest の場合：自分の申請でなければ 404（他人の申請があることも見せない）
  const row = await db.query.lostReports.findFirst({
    where: eq(lostReports.id, id),
    with: lostReportWith,
  });
  if (!row || row.guestId !== actor.id) {
    throw notFound("遺失物申請が見つかりません");
  }

  // 4. 共通の形にして返す（guest 用：紐づいた拾得物の中身を返さない）
  return Response.json(toLostReport(row) satisfies LostReport);
});

// 遺失物申請の入力情報の変更（guest は自分の申請だけ）。画面：G04・G05
export const PATCH = apiHandler(async (request, ctx) => {
  // 1. 権限を確かめる（guest のみ）
  const guest = await requireGuest(request);

  // 2. 入力を確かめる
  const { id } = parseParams(
    await (ctx as ParamsContext).params,
    LostReportIdParams,
  );
  const body = await parseBody(request, LostReportPatchBody);

  // 3. DB から取って確かめ、searching のときだけ更新する
  const db = getDb();
  const existing = await db.query.lostReports.findFirst({
    where: eq(lostReports.id, id),
  });
  if (!existing || existing.guestId !== guest.id) {
    throw notFound("遺失物申請が見つかりません");
  }
  if (existing.status !== "searching") {
    throw conflict("探し中以外の申請は変更できません");
  }

  // categoryId が指定されている場合は存在確認（存在しない ID による外部キーエラーで 500 になるのを防ぐ）
  if (body.categoryId !== undefined) {
    const category = await db.query.categories.findFirst({
      where: eq(categories.id, body.categoryId),
    });
    if (!category) {
      throw badRequest("指定されたカテゴリが存在しません");
    }
  }

  // ISO 文字列の lostAt を Date 型に変換して更新データを組み立てる
  const { lostAt, ...rest } = body;
  const updateValues = {
    ...rest,
    ...(lostAt !== undefined ? { lostAt: new Date(lostAt) } : {}),
  };

  // 同時操作対策のため、UPDATE の WHERE にも guestId と status = 'searching' を入れる
  const [updated] = await db
    .update(lostReports)
    .set(updateValues)
    .where(
      and(
        eq(lostReports.id, id),
        eq(lostReports.guestId, guest.id),
        eq(lostReports.status, "searching"),
      ),
    )
    .returning();

  if (!updated) {
    throw conflict("ステータスが変更されたため更新できませんでした");
  }

  // 4. 関連データ（category 等）を含めて取り直し、共通の形にして返す
  const row = await db.query.lostReports.findFirst({
    where: eq(lostReports.id, id),
    with: lostReportWith,
  });
  if (!row) {
    throw notFound("遺失物申請が見つかりません");
  }

  return Response.json(toLostReport(row) satisfies LostReport);
});
