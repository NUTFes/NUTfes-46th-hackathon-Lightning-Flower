import { count, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { categories, guests, lostReports } from "@/db/schema";
import { requireAdmin, requireGuest } from "@/lib/api/auth";
import { badRequest, forbidden, notFound } from "@/lib/api/errors";
import { apiHandler } from "@/lib/api/handler";
import { parseBody, parseQuery } from "@/lib/api/parse";
import {
  lostReportFilters,
  lostReportForAdminWith,
  lostReportWith,
} from "@/lib/queries/lost-reports";
import { toOffset } from "@/lib/schemas/common";
import {
  CreateLostReportBody,
  type LostReport,
  type LostReportForAdminList,
  LostReportListQuery,
} from "@/lib/schemas/lost-report";
import {
  toLostReport,
  toLostReportForAdmin,
} from "@/lib/serializers/lost-report";

// 遺失物申請の一覧・検索（admin）。画面：A04
export const GET = apiHandler(async (request) => {
  // 1. 権限を確かめる（admin のみ）
  await requireAdmin(request);

  // 2. 入力を確かめる（合わなければ 400）
  const query = parseQuery(request, LostReportListQuery);

  // 3. DB から取る（一覧と件数を同じ条件で、受付日時の新しい順）
  const db = getDb();
  const where = lostReportFilters(query);
  const [rows, [{ total }]] = await Promise.all([
    db.query.lostReports.findMany({
      where,
      with: lostReportForAdminWith,
      orderBy: [desc(lostReports.createdAt), desc(lostReports.number)],
      limit: query.limit,
      offset: toOffset(query),
    }),
    db.select({ total: count() }).from(lostReports).where(where),
  ]);

  // 4. 共通の形にして返す
  return Response.json({
    items: rows.map((row) => toLostReportForAdmin(row)),
    total,
  } satisfies LostReportForAdminList);
});

// 遺失物申請の新規作成（guest）。画面：G03 → G04
export const POST = apiHandler(async (request) => {
  // 1. 権限を確かめる（guest のみ）
  const guest = await requireGuest(request);

  // 2. 入力を確かめる
  const body = await parseBody(request, CreateLostReportBody);

  // 3. DB で同意状態・カテゴリを確かめて登録する
  const db = getDb();

  // 個人情報の取り扱いに同意していない guest（行がない / agreedAt が空）は 403
  const guestRow = await db.query.guests.findFirst({
    where: eq(guests.id, guest.id),
  });
  if (!guestRow || guestRow.agreedAt == null) {
    throw forbidden("個人情報の取り扱いに同意していません");
  }

  // 存在しない categoryId による外部キーエラー（500）を防ぐ
  const category = await db.query.categories.findFirst({
    where: eq(categories.id, body.categoryId),
  });
  if (!category) {
    throw badRequest("指定されたカテゴリが存在しません");
  }

  // status は DB のデフォルト値（searching）で登録される
  const [inserted] = await db
    .insert(lostReports)
    .values({
      guestId: guest.id,
      categoryId: body.categoryId,
      color: body.color,
      brand: body.brand ?? null,
      lostPlace: body.lostPlace,
      lostAt: new Date(body.lostAt),
      note: body.note ?? null,
    })
    .returning({ id: lostReports.id });

  // 4. 関連データ（category）を含めて取り直し、201 で返す
  const row = await db.query.lostReports.findFirst({
    where: eq(lostReports.id, inserted.id),
    with: lostReportWith,
  });
  if (!row) {
    throw notFound("遺失物申請が見つかりません");
  }

  return Response.json(toLostReport(row) satisfies LostReport, {
    status: 201,
  });
});
