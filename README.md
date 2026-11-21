# オトシル

技大祭の落とし物アプリ（46th NUTMEG ハッカソン・Lightning Flower）。
仕様は Notion の「46th NUTMEG ハッカソン」のページ（機能仕様・設計仕様）、画面は Figma「オトシル 画面構成」を見る。

- 画面と API：Next.js（App Router。API は `src/app/api/` の Route Handlers）
- UI：Chakra UI v3
- DB・写真・guest のログイン：Supabase（PostgreSQL・Storage・Auth）。ORM は Drizzle
- API の仕様：zod で入出力を書き、`openapi.yaml` を出力する
- 本番：Vercel。member / admin の画面は Cloudflare Access の内側に置く

## 必要なもの

- Docker（Docker Desktop か OrbStack）
- Node.js 24（Supabase CLI を `npx` で動かすのに使う。アプリはコンテナの中の Node.js で動く）
- make

## はじめての準備

```sh
git clone https://github.com/NUTFes/NUTfes-46th-hackathon-Lightning-Flower.git
cd NUTfes-46th-hackathon-Lightning-Flower
make setup   # Supabase を起動し、.env.local を作り、アプリのイメージを作る（初回は 5〜10 分）
make up      # http://localhost:3000 で開く
```

`http://localhost:3000/api/health` が `{"status":"ok","db":"ok"}` を返せば、アプリと DB がつながっている。

- ポート 3000 が埋まっているときは `APP_PORT=3100 make up` のように変える。
- エディタで型の補完を効かせたいときは、ホストでも `corepack enable pnpm && pnpm install` をする（コンテナの中の `node_modules` とは別もの）。

## コマンド

`make help` で一覧が出る。よく使うもの：

| コマンド                | 内容                                                 |
| ----------------------- | ---------------------------------------------------- |
| `make up` / `make down` | Supabase とアプリを起動・停止する                    |
| `make logs`             | アプリのログを見る                                   |
| `make sh`               | アプリのコンテナに入る（`pnpm add` などはここで）    |
| `make db-generate`      | `src/db/schema.ts` からマイグレーションを作る        |
| `make db-migrate`       | マイグレーションをローカルの DB に当てる             |
| `make db-reset`         | ローカルの DB を空にして、マイグレーションを当て直す |
| `make db-studio`        | Supabase Studio（`http://127.0.0.1:54323`）を開く    |
| `make check`            | 型チェック・Lint・整形・テスト（PR の CI と同じ）    |
| `make format`           | Prettier で整形する                                  |
| `make openapi`          | zod スキーマから `openapi.yaml` を出す               |

## フォルダ

| 場所                          | 中身                                                         | 担当 |
| ----------------------------- | ------------------------------------------------------------ | ---- |
| `src/app/`                    | 画面                                                         | 画面 |
| `src/app/api/`                | API（Route Handlers）                                        | API  |
| `src/lib/schemas/`            | API の入出力の zod スキーマ。`z` は `./zod` から import する | API  |
| `src/lib/openapi/registry.ts` | OpenAPI に載せるスキーマとパスの登録                         | API  |
| `src/lib/auth/`               | member / admin の判定（Cloudflare Access の JWT）            | API  |
| `src/db/`                     | Drizzle のスキーマとマイグレーション                         | DB   |
| `src/components/ui/`          | Chakra UI の Provider など                                   | 画面 |
| `supabase/config.toml`        | ローカルの Supabase の設定（写真のバケット `photos` もここ） | —    |

## ローカルでの member / admin

ローカルには Cloudflare Access がないので、`.env.local` の `DEV_STAFF_EMAIL` のメールでログインしたことにする。
admin で試すときは `DEV_STAFF_EMAIL` を `ADMIN_EMAIL` と同じにして、`make restart` する。
この仕組みは `next dev` のときだけ効き、Vercel では効かない。

## 環境変数

一覧は `.env.example`。ローカルの値は `make setup`（または `make env`）が `.env.local` に書く。
本番・プレビューの値は Vercel の環境変数に入っている。
