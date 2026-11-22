// ローカルの DB に、開発用のサンプルデータを入れる（make db-seed-dev）。本番には入れない。
// 拾得物いくつかと、紐づけ・受け渡しを試すための参加者 1 人と遺失物申請 1 件を入れる。
// 写真のファイルは置かないので、API の写真の URL は "" になる。
// カテゴリはマイグレーション（src/db/migrations/0001_seed_categories.sql）で入っている。
import { eq, sql } from "drizzle-orm";
import { getDb } from "../src/db";
import {
  foundItemPhotos,
  foundItems,
  guests,
  handovers,
  lostReports,
  matches,
} from "../src/db/schema";

// 2 回目以降は入れない（入れ直すときは make db-reset）。この参加者がいるかで判定する
const GUEST_ID = "00000000-0000-4000-8000-000000000001";
const GUEST_EMAIL = "guest@example.com";
// DEV_STAFF_EMAIL の登録（?mine=true・canEdit を試す）と、ほかの member の登録を混ぜる
const OTHER_EMAIL = "other-member@example.com";

function main() {
  if (process.env.VERCEL_ENV || process.env.NODE_ENV === "production") {
    throw new Error("本番・プレビューでは実行しない");
  }
  const myEmail = process.env.DEV_STAFF_EMAIL;
  if (!myEmail) throw new Error("DEV_STAFF_EMAIL が設定されていません");
  return seed(myEmail);
}

async function seed(myEmail: string) {
  const db = getDb();

  const existing = await db.query.guests.findFirst({
    where: eq(guests.id, GUEST_ID),
  });
  if (existing) {
    console.log(
      "サンプルデータはもう入っています（入れ直すなら make db-reset）",
    );
    return;
  }

  await db.transaction(async (tx) => {
    const at = (time: string) => new Date(`2026-09-19T${time}:00+09:00`);

    const items = await tx
      .insert(foundItems)
      .values([
        {
          categoryId: 6,
          features: "紺色のワイヤレスイヤホン",
          brand: "SONY",
          foundPlace: "屋外ステージ付近",
          foundAt: at("13:35"),
          isValuable: false,
          memo: "ケースにシールが貼られている",
          registeredByEmail: myEmail,
        },
        {
          categoryId: 2,
          features: "黒い革の長財布",
          foundPlace: "体育館の入口",
          foundAt: at("11:10"),
          isValuable: true,
          registeredByEmail: OTHER_EMAIL,
          status: "matching",
        },
        {
          categoryId: 10,
          features: "透明のビニール傘（100% 撥水と書いてある）",
          foundPlace: "正門",
          foundAt: at("10:05"),
          isValuable: false,
          registeredByEmail: myEmail,
        },
        {
          categoryId: 4,
          features: "鈴の付いた自転車の鍵",
          foundPlace: "駐輪場",
          foundAt: at("12:20"),
          isValuable: true,
          registeredByEmail: OTHER_EMAIL,
          status: "resolved",
        },
        {
          categoryId: 9,
          features: "白いタオル",
          foundPlace: "屋外ステージ付近",
          foundAt: at("15:00"),
          isValuable: false,
          memo: "模擬店のロゴ入り",
          registeredByEmail: OTHER_EMAIL,
        },
        {
          // 論理削除したもの（一覧には出ない）
          categoryId: 12,
          features: "削除したサンプル",
          foundPlace: "どこか",
          foundAt: at("09:00"),
          isValuable: false,
          registeredByEmail: myEmail,
          deletedAt: at("09:30"),
        },
      ])
      .returning({ id: foundItems.id });
    const [earphones, wallet, , key] = items;

    // 写真の行（ファイルはない）。一覧では 1 枚目だけ返ることを試す
    await tx.insert(foundItemPhotos).values([
      {
        foundItemId: earphones.id,
        storagePath: "found/sample-1.jpg",
        thumbPath: "found/sample-1_thumb.jpg",
        sortOrder: 0,
      },
      {
        foundItemId: earphones.id,
        storagePath: "found/sample-2.jpg",
        thumbPath: "found/sample-2_thumb.jpg",
        sortOrder: 1,
      },
    ]);

    // 参加者は Supabase Auth のユーザーが要るので、ローカルの auth.users に直接入れる
    await tx.execute(
      sql`insert into auth.users (id, email, aud, role) values (${GUEST_ID}, ${GUEST_EMAIL}, 'authenticated', 'authenticated')`,
    );
    await tx.insert(guests).values({
      id: GUEST_ID,
      email: GUEST_EMAIL,
      displayName: "サンプル参加者",
      agreedAt: at("10:30"),
    });

    // 財布に紐づいた申請（activeMatch を試す）
    const [report] = await tx
      .insert(lostReports)
      .values({
        guestId: GUEST_ID,
        categoryId: 2,
        features: "黒い長財布",
        lostPlace: "体育館",
        lostAt: at("11:00"),
        status: "maybe_found",
      })
      .returning({ id: lostReports.id });
    await tx.insert(matches).values({
      lostReportId: report.id,
      foundItemId: wallet.id,
      matchedByEmail: OTHER_EMAIL,
    });

    // 鍵は本部で直接返却した（handover を試す）
    await tx.insert(handovers).values({
      foundItemId: key.id,
      handedAt: at("14:00"),
      receiverName: "山田",
      recordedByEmail: OTHER_EMAIL,
    });
  });

  console.log("サンプルデータを入れました");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
