// テーブル定義。Notion の設計仕様「DB設計」のとおり。
// 変えたら `make db-generate` でマイグレーションを作り、`make db-migrate` で当てる（変更は DB 担当が行う）。
//
// アプリの DB アクセスはすべて Next.js のサーバー側から行い、ブラウザから Supabase のテーブルを
// 直接読ませない。そのため全テーブルで RLS を有効にし、ポリシーは作らない（anon からは読めない）。
import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase";

// --- enum --------------------------------------------------------------------

export const foundStatus = pgEnum("found_status", [
  "received", // 受理
  "matching", // 照合中
  "awaiting_handover", // 受け渡し待ち
  "resolved", // 解決済み
  "transferred_to_police", // 警察へ移管
  "disposed", // 処分
]);

export const lostStatus = pgEnum("lost_status", [
  "searching", // 探し中
  "maybe_found", // 見つかったかも
  "awaiting_handover", // 受け渡し待ち
  "resolved", // 解決済み
  "transferred_to_police", // 警察へ移管
  "disposed", // 処分
  "cancelled", // 取り消し済み
]);

export const pickupMethod = pgEnum("pickup_method", [
  "today", // 今日取りに行く
  "later", // 後日取りに行く
  "other", // 自由記述
]);

export const cancelReason = pgEnum("cancel_reason", [
  "found_myself", // 自分で見つけた
  "no_longer_needed", // もう探さなくていい
  "other", // その他
]);

export const senderRole = pgEnum("sender_role", ["admin", "guest"]);

// --- 共通の列 ----------------------------------------------------------------

const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

const createdAt = () => timestamptz("created_at").notNull().defaultNow();
const updatedAt = () =>
  timestamptz("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

// --- テーブル ----------------------------------------------------------------

// カテゴリ 12 種と貴重品の初期値。中身はマイグレーション（seed_categories）で入れる
export const categories = pgTable("categories", {
  id: smallint("id").primaryKey(),
  name: text("name").notNull().unique(),
  isValuableDefault: boolean("is_valuable_default").notNull(),
  sortOrder: smallint("sort_order").notNull(),
}).enableRLS();

// 拾得物（member が登録）。削除は deleted_at を入れる論理削除
export const foundItems = pgTable(
  "found_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // 管理番号の数字部分。画面では「拾-00042」と整形する（src/lib/display-number.ts）
    number: integer("number").notNull().unique().generatedAlwaysAsIdentity(),
    categoryId: smallint("category_id")
      .notNull()
      .references(() => categories.id),
    features: text("features").notNull(),
    brand: text("brand"),
    foundPlace: text("found_place").notNull(),
    foundAt: timestamptz("found_at").notNull().defaultNow(),
    isValuable: boolean("is_valuable").notNull(),
    memo: text("memo"),
    status: foundStatus("status").notNull().default("received"),
    registeredByEmail: text("registered_by_email").notNull(),
    disposedAt: timestamptz("disposed_at"),
    disposalNote: text("disposal_note"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: timestamptz("deleted_at"),
  },
  (t) => [
    index("found_items_status_idx").on(t.status),
    index("found_items_category_status_idx").on(t.categoryId, t.status),
    index("found_items_found_at_idx").on(t.foundAt),
  ],
).enableRLS();

// 拾得物の写真。画像は Supabase Storage（photos バケット）に置き、ここにはパスだけ持つ
export const foundItemPhotos = pgTable(
  "found_item_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    foundItemId: uuid("found_item_id")
      .notNull()
      .references(() => foundItems.id, { onDelete: "cascade" }),
    storagePath: text("storage_path").notNull(),
    thumbPath: text("thumb_path").notNull(),
    sortOrder: smallint("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("found_item_photos_found_item_idx").on(t.foundItemId)],
).enableRLS();

// 参加者（Google ログイン）。id は Supabase Auth の auth.users.id。
// member / admin はテーブルを持たず、Cloudflare Access のメールを文字列で記録する。
// 30 日後の削除で auth.users を消すと、guests → lost_reports → matches・messages まで消える
export const guests = pgTable("guests", {
  id: uuid("id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  displayName: text("display_name"),
  agreedAt: timestamptz("agreed_at"), // 個人情報の取り扱いに同意した日時
  createdAt: createdAt(),
}).enableRLS();

// 遺失物申請（guest が作成）。受け取り方法・取り消し理由も 1 申請につき 1 回なのでここに持つ
export const lostReports = pgTable(
  "lost_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // 申請番号の数字部分。画面では「申-00118」と整形する
    number: integer("number").notNull().unique().generatedAlwaysAsIdentity(),
    guestId: uuid("guest_id")
      .notNull()
      .references(() => guests.id, { onDelete: "cascade" }),
    categoryId: smallint("category_id")
      .notNull()
      .references(() => categories.id),
    features: text("features").notNull(),
    brand: text("brand"),
    lostPlace: text("lost_place").notNull(),
    lostAt: timestamptz("lost_at").notNull(),
    note: text("note"),
    status: lostStatus("status").notNull().default("searching"),
    verifiedAt: timestamptz("verified_at"), // admin が本人確認 OK にした日時
    pickupMethod: pickupMethod("pickup_method"),
    pickupNote: text("pickup_note"),
    cancelReason: cancelReason("cancel_reason"),
    cancelNote: text("cancel_note"),
    cancelledAt: timestamptz("cancelled_at"),
    createdAt: createdAt(), // 受付日時
    updatedAt: updatedAt(),
  },
  (t) => [
    index("lost_reports_guest_idx").on(t.guestId),
    index("lost_reports_status_idx").on(t.status),
  ],
).enableRLS();

// 遺失物申請と拾得物の紐づけ。解除しても行は消さず released_at を入れる（履歴が残る）。
// 有効な紐づけ（released_at が NULL）は、1 申請に 1 件・1 拾得物に 1 件に絞る。
// 複数件 OK に決まったら、下の 2 つの部分 UNIQUE インデックスを消せばよい
export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lostReportId: uuid("lost_report_id")
      .notNull()
      .references(() => lostReports.id, { onDelete: "cascade" }),
    foundItemId: uuid("found_item_id")
      .notNull()
      .references(() => foundItems.id),
    matchedByEmail: text("matched_by_email").notNull(),
    createdAt: createdAt(),
    releasedAt: timestamptz("released_at"),
  },
  (t) => [
    uniqueIndex("matches_active_lost_report_uq")
      .on(t.lostReportId)
      .where(sql`${t.releasedAt} is null`),
    uniqueIndex("matches_active_found_item_uq")
      .on(t.foundItemId)
      .where(sql`${t.releasedAt} is null`),
  ],
).enableRLS();

// チャット（テキストのみ）。1 申請 = 1 スレッド。既読は持たない。
// 返信待ち＝その申請の最新メッセージの sender_role が guest
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lostReportId: uuid("lost_report_id")
      .notNull()
      .references(() => lostReports.id, { onDelete: "cascade" }),
    senderRole: senderRole("sender_role").notNull(),
    senderEmail: text("sender_email"),
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  // ポーリングは「created_at が前回より後」で取る。created_at はトランザクションの開始時刻なので、
  // 同時に書かれたメッセージが、前回取った最新より前の時刻で後から見えることがある。
  // 取りこぼさないように、前回より少し前（数秒）から取り直し、画面側で id で重複を除く
  (t) => [
    index("messages_lost_report_created_idx").on(t.lostReportId, t.createdAt),
  ],
).enableRLS();

// 受け渡し記録。⑥ 通常の受け渡しは lost_report_id あり、②'' 本部での直接返却は NULL。
// receiver_name は個人情報なので、30 日後に NULL にする
export const handovers = pgTable(
  "handovers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    foundItemId: uuid("found_item_id")
      .notNull()
      .references(() => foundItems.id),
    lostReportId: uuid("lost_report_id").references(() => lostReports.id, {
      onDelete: "set null",
    }),
    handedAt: timestamptz("handed_at").notNull(),
    receiverName: text("receiver_name"),
    recordedByEmail: text("recorded_by_email").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("handovers_found_item_idx").on(t.foundItemId)],
).enableRLS();
