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

| 場所                             | 中身                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/api/handler.ts`         | `apiHandler`（エラーを共通の形の応答にし、`Cache-Control: private, no-store` を付ける）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `src/lib/api/auth.ts`            | `requireActor`・`requireStaff`・`requireAdmin`・`requireGuest`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `src/lib/api/parse.ts`           | `parseBody`・`parseQuery`・`parseParams`（入力の検証。失敗は 400。クエリの空の値は指定なし）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `src/lib/api/errors.ts`          | `badRequest`・`unauthorized`・`forbidden`・`notFound`・`conflict`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `src/lib/api/transition.ts`      | `notFoundOrConflict`（状態を変える UPDATE が 0 行だったとき、行がなければ 404、あれば 409 にする）・`conflictOnUniqueViolation`（INSERT の UNIQUE 違反を 409 にする）                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `src/lib/schemas/common.ts`      | enum（`FoundStatus` など）、`DateTime`、`CategoryRef`、一覧の `PageQuery`・`paginated()`・`toOffset()`、クエリの `csvEnum`・`BooleanQuery`・`SearchQuery`・`SmallIdQuery`・`DateTimeQuery`                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `src/lib/schemas/found-item.ts`  | `FoundItem`・`FoundItemList`・`FoundItemListQuery`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `src/lib/schemas/lost-report.ts` | `LostReport`（guest にも返す）・`LostReportForAdmin`（admin 用の項目を足したもの）と、それぞれの一覧                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `src/lib/serializers/`           | DB の行を JSON にする `toFoundItem`・`toLostReport`・`toLostReportForAdmin`（`displayNumber`・`canEdit`・`activeMatch` など）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `src/lib/queries/`               | 上の関数に渡す行を取るための `with`（`foundItemWith`・`lostReportForAdminWith` など。取った行の型が serializer の引数の型になる）と、拾得物の絞り込みの条件（削除していない 1 件は `activeFoundItemById`）。状態を変える API で使う、行があるかの `findLostReportId`・`findFoundItemId` と、更新したあとの申請を取る `findLostReportForAdmin`・拾得物を取る `findFoundItem`。拾得物から始める API で、紐づいた申請を先にロックする `lockActiveMatch`。写真のパスをほかの拾得物が使っているかを見る `isPhotoPathUsed`（拾得物の登録と写真の差し替えで使う）。返信待ちの決め方（`isAwaitingReply`・`awaitingReplyWhere`） |
| `src/lib/storage/photos.ts`      | 写真の署名付き URL をまとめて作る `signPhotoUrls`・アップロード先のパスと署名付きアップロード URL を作る `createPhotoUpload`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `src/db/like.ts`                 | 部分一致の検索で、入力の `%` `_` をエスケープする `containsPattern`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `src/db/enums.ts`                | enum の値（DB と zod の両方で使う）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

拾得物を返す API は、`foundItemWith` で取って `toFoundItem` に渡せば、一覧・詳細・登録のどれでも同じ形になる。一覧では `foundItemListWith`（写真は 1 枚目だけ）で取り、`photoPathsOf(rows, "thumb")` でサムネイルだけを署名する。

だれに何を見せるか（Notion の設計仕様「API設計」の「データの形」）：

- 拾得物（`FoundItem`）は member と admin で同じ形。`activeMatch`（紐づいた申請の番号）と `handover`（受け取った人の名前）も member に返す。違うのは `canEdit` だけ
- 遺失物申請は、guest には `toLostReport`、admin には `toLostReportForAdmin` を使う。`guest`・`activeMatch`・`awaitingReply` は admin にだけ返す（guest に紐づいた拾得物の中身を見せないため）
- 返信待ち（`awaitingReply`）は、最新のメッセージが guest で、申請が終わっていない（`ENDED_LOST_STATUSES` でない）もの。終わった申請には guest が送れないので外す。ダッシュボードの件数・`GET /api/chats`・`toLostReportForAdmin` は、どれも `src/lib/queries/awaiting-reply.ts` で決める（行で決めるときは `isAwaitingReply`、SQL で絞るときは `awaitingReplyWhere`）

## 決まりごと

- 一覧は `?page=1&limit=20` で受け（`PageQuery` を `extend` する）、`{ items, total }` で返す。件数は一覧と同じ `where` で数える
- 複数の値はカンマ区切りで受ける（`csvEnum`）。真偽値は `"true"` / `"false"`（`BooleanQuery`）
- クエリの ID は `SmallIdQuery`（`smallint` の列）か `z.uuid()`、日時は `DateTimeQuery` で受ける（範囲外の数を DB に送ると 500 になるため）
- 画面からクエリ付きで呼ぶときは、`URLSearchParams` で組み立てる。`+09:00` の `+` は、エンコードしないと空白として届く（`DateTimeQuery` は空白を `+` に戻すが、ほかの値は戻らない）
- 拾得物は論理削除なので、取るときは `isNull(foundItems.deletedAt)` を条件に入れる。削除できるのは、受理（`received`）で有効な紐づけがないときだけ（それ以外は 409）。そのため、削除した拾得物が申請の `activeMatch` に残ることはない
- 検索の文字列は `SearchQuery` で受ける（前後の空白を除き、空なら指定なし）
- refine を付けたスキーマには `.pick()` / `.omit()` が使えない。拾得物の一覧のクエリを減らして使うときは、`withFoundRangeCheck(FoundItemListQueryBase.omit({ ... }))` のように、refine の前の形から作る
- メッセージは 1 つのトランザクションで 1 通だけ入れ、`created_at` には `clock_timestamp()` を入れる（既定の `now()` はトランザクションの開始の時刻なので、ロックを待ったあとに入れると先に入ったメッセージより前の時刻になり、ポーリングで取りこぼしたり「最新」が入れ替わったりする）。「最新」は `created_at` の新しい順・`id` の順で決める
- 状態を変える処理は、1 つのトランザクションで、`UPDATE` の `WHERE` に今の状態を入れる。更新できなければ `conflict()`（409）。書き方は下の「状態を変える API」
- スキーマ（`src/lib/schemas/`）の `z` は `./zod` から import する（`.openapi()` が使えるようにするため）

## 状態を変える API

`POST /api/lost-reports/{id}/matches`（`src/app/api/lost-reports/[id]/matches/route.ts`）をまねる。

1. `getDb().transaction(async (tx) => { ... })` の中で、`tx.update(...).set(...).where(and(eq(id), eq(status, 今の状態))).returning({ id })` で更新する
2. 返った行がなければ、`throw await notFoundOrConflict(find〇〇Id(tx, id), "…ではないので、…できません", "…が見つかりません")`。行がなければ 404、あれば 409 になり、トランザクションは取り消される（先に更新した行も戻る）
3. 申請と拾得物の両方を更新するときは、**申請 → 拾得物の順**に更新する（行のロックの順をどの API でも同じにして、デッドロックを避ける）。拾得物から始める API（拾得物だけのステータスの変更 `PATCH status` など。紐づいた申請を変えないときも）は、先に `matches` から有効な紐づけの `lost_report_id` を取り、その申請を先に `UPDATE` か `SELECT … FOR UPDATE` してから拾得物を更新する。申請をロックしたあとで、紐づけがまだ有効かを確かめ直す（`lockActiveMatch` がこれをする。最初から紐づけがなければ `null` を返すので、拾得物の `UPDATE` の `WHERE` に `received` を入れる。ロックを待つ間に紐づけが変わっていたら 409 にする）。
   例外：`received` の拾得物だけを対象にして、申請を変えない API（一括変更 `bulk-status`、拾得物の削除 `DELETE`）は、申請をロックしなくてよい（`received` の拾得物には有効な紐づけがない。紐づけは拾得物を `matching` に `UPDATE` するので、拾得物の行をロックしたあとは入らない。申請の行に触らないので、ロックの順は逆にならない）。一括変更は拾得物の行を ID の順に `FOR UPDATE` し、削除は 1 行なので `UPDATE` の `WHERE` に `received` を入れるだけでよい。申請も変えることに決まったら、この手順に戻す
4. 紐づけ（`matches`）を変える処理は、紐づけだけを変えずに、**必ず申請の行も先に `UPDATE`（か `SELECT … FOR UPDATE`）する**（下の「同時に操作したとき」の前提）
5. `INSERT` が UNIQUE 制約に当たりうるとき（状態の列と行が食い違っていたときなど）は、`.catch(conflictOnUniqueViolation("…"))` で 409 にする
6. 更新したあとの行を同じトランザクションの中で取り、共通の形にして返す。申請を変える admin の API は、`findLostReportForAdmin(tx, id)` で取って `toLostReportForAdmin` で返す（画面が返り値でそのまま表示を更新できる）。guest の API（`PUT /pickup`・`POST /cancel`）は `findLostReport(tx, id)` で取って `toLostReport` で返す。guest の API は `UPDATE` の `WHERE` に `guestId` も入れ、0 行のときは `findGuestLostReportId(tx, id, guestId)` を渡して、ほかの人の申請は 404 にする

同時に操作したとき：後の `UPDATE` は前のトランザクションの終わりを待ち、変わったあとの行で `WHERE` を見直すので、0 行になって 409 になる。ただし見直されるのは**更新しようとしている行の列だけ**で、`EXISTS` などの副問い合わせは、文が始まったときのまま評価される（READ COMMITTED）。本人確認（`POST /verify`）は `EXISTS` で紐づけを見ているが、紐づけを変える処理が申請の行も更新する（手順 4）ので、申請の `status` の条件で 0 行になる。

拾得物を削除するときは、受理（`received`）で有効な紐づけがないときだけにする（「決まりごと」のとおり）。照合中の拾得物を削除したくなったら、先に紐づけを解除する。

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
