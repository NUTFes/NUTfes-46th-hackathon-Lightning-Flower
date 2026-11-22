# API の書き方

API は Next.js の Route Handlers（`src/app/api/`）で書く。パスと入出力の形は、Notion の設計仕様「API設計」のとおりにする。

## 見本

`GET /api/found-items`（`src/app/api/found-items/route.ts`）をまねる。どの API も、次の 4 つの順に書く。

1. **権限を確かめる**：`requireStaff(request)` など。合わなければ 401 / 403 になる
2. **入力を確かめる**：`parseQuery`・`parseBody`・`parseParams` に zod スキーマを渡す。合わなければ 400 になる
3. **DB から取る・書く**：`getDb()` の Drizzle で。関連の行は `db.query.<テーブル>.findMany({ with })` でまとめて取る
4. **共通の形にして返す**：`src/lib/serializers/` の関数で JSON の形にし、`satisfies <レスポンスの型>` を付けて `Response.json` で返す

全体を `apiHandler` で包む。中で投げた `ApiError`（`badRequest`・`notFound`・`conflict` など）は、そのステータスの `{ error: { code, message } }` になり、想定外のエラーは 500 になる。

小さい見本は `src/app/api/me`・`src/app/api/categories`。

## 共通の部品

| 場所                             | 中身                                                                                                                              |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/api/handler.ts`         | `apiHandler`（エラーを共通の形の応答にする）                                                                                      |
| `src/lib/api/auth.ts`            | `requireActor`・`requireStaff`・`requireAdmin`・`requireGuest`                                                                    |
| `src/lib/api/parse.ts`           | `parseBody`・`parseQuery`・`parseParams`（入力の検証。失敗は 400）                                                                |
| `src/lib/api/errors.ts`          | `badRequest`・`unauthorized`・`forbidden`・`notFound`・`conflict`                                                                 |
| `src/lib/schemas/common.ts`      | enum（`FoundStatus` など）、`DateTime`、`CategoryRef`、一覧の `PageQuery`・`paginated()`・`toOffset()`、`csvEnum`・`BooleanQuery` |
| `src/lib/schemas/found-item.ts`  | `FoundItem`・`FoundItemList`・`FoundItemListQuery`                                                                                |
| `src/lib/schemas/lost-report.ts` | `LostReport`（guest にも返す）・`LostReportForAdmin`（admin 用の項目を足したもの）と、それぞれの一覧                              |
| `src/lib/serializers/`           | DB の行を JSON にする `toFoundItem`・`toLostReport`・`toLostReportForAdmin`（`displayNumber`・`canEdit`・`activeMatch` など）     |
| `src/lib/queries/`               | 上の関数に渡す行を取るための `with`（`foundItemWith`・`lostReportForAdminWith` など）と、拾得物の絞り込みの条件                   |
| `src/lib/storage/photos.ts`      | 写真の署名付き URL をまとめて作る `signPhotoUrls`                                                                                 |
| `src/db/like.ts`                 | 部分一致の検索で、入力の `%` `_` をエスケープする `containsPattern`                                                               |
| `src/db/enums.ts`                | enum の値（DB と zod の両方で使う）                                                                                               |

拾得物を返す API は、`foundItemWith` で取って `toFoundItem` に渡せば、一覧・詳細・登録のどれでも同じ形になる。遺失物申請は、guest には `toLostReport`、admin には `toLostReportForAdmin` を使う（guest に紐づいた拾得物の中身を見せないため）。

## 決まりごと

- 一覧は `?page=1&limit=20` で受け（`PageQuery` を `extend` する）、`{ items, total }` で返す。件数は一覧と同じ `where` で数える
- 複数の値はカンマ区切りで受ける（`csvEnum`）。真偽値は `"true"` / `"false"`（`BooleanQuery`）
- 拾得物は論理削除なので、取るときは `isNull(foundItems.deletedAt)` を条件に入れる
- 状態を変える処理は、1 つのトランザクションで、`UPDATE` の `WHERE` に今の状態を入れる。更新できなければ `conflict()`（409）
- スキーマ（`src/lib/schemas/`）の `z` は `./zod` から import する（`.openapi()` が使えるようにするため）

## OpenAPI

API を足したら、`src/lib/openapi/registry.ts` に `registry.registerPath` でパスを登録する（`GET /api/found-items` の登録をまねる）。クエリは `request.query`、本文は `request.body` にスキーマを渡す。応答には、使う部品に合わせて 400・401・403・500 などを入れる。

登録したら `make openapi` で `openapi.yaml` を出し直して、一緒にコミットする（CI で食い違いを確かめている）。

## テスト

Vitest で、`*.test.ts` を対象のファイルの隣に置く（例：`src/lib/serializers/found-item.test.ts`）。`make check` で全部動く。

- 変換の関数・スキーマ・計算は、テストを書く
- CI には DB がないので、DB につなぐテストは書かない。DB を使うところは、`make db-seed-dev` でサンプルデータを入れて、`curl` で確かめる

```sh
make up
make db-seed-dev
curl 'http://localhost:3000/api/found-items?status=received&mine=true'
```
