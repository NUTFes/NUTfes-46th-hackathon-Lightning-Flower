# オトシル

技大祭の落とし物アプリ（46th NUTMEG ハッカソン・Lightning Flower）。
仕様は Notion の「46th NUTMEG ハッカソン」のページ（機能仕様・設計仕様）、画面は Figma「オトシル 画面構成」を見る。

- 画面と API：Next.js（App Router。API は `src/app/api/` の Route Handlers）
- UI：Chakra UI v3
- DB・写真・guest のログイン：Supabase（PostgreSQL・Storage・Auth）。ORM は Drizzle
- API の仕様：zod で入出力を書き、`openapi.yaml` を出力する
- 本番：Vercel。member / admin の画面は Cloudflare Access の内側に置く

## 必要なもの

macOS と Windows 11（WSL2）のどちらでも、同じ手順（`make`）で動く。

|              | macOS                                                               | Windows 11                                                                  |
| ------------ | ------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 作業する場所 | ターミナル                                                          | WSL2 の Ubuntu の中（PowerShell ではない）                                  |
| Docker       | Docker Desktop か OrbStack                                          | Docker Desktop（設定の Resources → WSL integration で Ubuntu を有効にする） |
| git・make    | Xcode Command Line Tools（`xcode-select --install`）                | `sudo apt update && sudo apt install -y git make`                           |
| Node.js 24   | [mise](https://mise.jdx.dev/getting-started.html) で `mise install` | 同じ（Ubuntu の apt の Node.js は古いので使わない）                         |
| エディタ     | VS Code                                                             | VS Code に「WSL」拡張を入れ、Ubuntu の中で `code .` を実行して開く          |

Node.js は、Supabase CLI を `npx` で動かすのと、エディタの補完に使う。アプリ自体はコンテナの中の Node.js で動く。

### Windows の人へ

- **clone は WSL の中の git で、WSL のホーム（`~/` の下）にする。** `/mnt/c/...`（Windows の C ドライブ）に置くと、とても遅く、ファイルを保存しても画面に反映されない。
- Windows の git（Git for Windows）で clone しない（改行コードが変わることがある。`.gitattributes` で LF に揃えているが、念のため）。
- ブラウザは Windows 側で `http://localhost:3000` を開けばよい。

## はじめての準備

```sh
git clone https://github.com/NUTFes/NUTfes-46th-hackathon-Lightning-Flower.git
cd NUTfes-46th-hackathon-Lightning-Flower
mise install   # Node.js 24 を入れる
make setup     # Supabase を起動し、.env.local を作り、アプリのイメージを作って依存を入れる
make up        # http://localhost:3000 で開く
```

- 初回は、Supabase のイメージの取得（数分）と依存のインストール（1〜2 分）があるので、`make setup` は 5〜10 分かかる。
- `http://localhost:3000/api/health` が `{"status":"ok","db":"ok"}` を返せば、アプリと DB がつながっている。
- `.env.local` の `ADMIN_EMAIL` は空になっている。値は PM に聞いて入れ、`make restart` する（リポジトリが public なので、コミットするファイルには書かない）。

### エディタの補完

`node_modules` はコンテナの中（Docker のボリューム）にあり、ホストからは見えない。
VS Code で型の補完や ESLint を効かせるために、ホストでも依存を入れる。

```sh
corepack enable pnpm   # 初回だけ
pnpm install           # Next.js の型（next typegen）もあわせて作られる
```

依存が変わったとき（`git pull` で `pnpm-lock.yaml` が変わったときなど）も、ホストで `pnpm install` をやり直す。

## コマンド

`make help` で一覧が出る。

| コマンド                | 内容                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| `make up` / `make down` | Supabase とアプリを起動・停止する（`make up` は依存が変わっていれば入れ直す）            |
| `make restart`          | アプリを作り直して起動する（`.env.local` を変えたあと）                                  |
| `make logs`             | アプリのログを見る                                                                       |
| `make sh`               | アプリのコンテナに入る                                                                   |
| `make add PKG="dayjs"`  | 依存を足す（開発用は `make add-dev`、消すときは `make remove`）                          |
| `make db-generate`      | `src/db/schema.ts` からマイグレーションを作る                                            |
| `make db-migrate`       | マイグレーションをローカルの DB に当てる                                                 |
| `make db-reset`         | ローカルの DB を空にして、マイグレーションを当て直す                                     |
| `make db-studio`        | Supabase Studio（`http://127.0.0.1:54323`。テーブルの中身を見る画面）を開く              |
| `make check`            | 型チェック・Lint・整形・テスト（CI はこれに加えて build と `openapi.yaml` の確認もする） |
| `make format`           | Prettier で整形する                                                                      |
| `make openapi`          | zod スキーマから `openapi.yaml` を出す（API のスキーマを変えたら実行してコミットする）   |

- `pnpm add` や `pnpm db:migrate` をホストで直接実行しない（コンテナの中と食い違う。`.env.local` も読まれない）。`make` を使う。
- `git pull` やブランチの切り替えのあとは `make up` をやり直す（依存が変わっていれば入れ直す）。

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

## DB のスキーマ変更（マイグレーション）

マイグレーションのファイルは番号順に作られるので、2 人が別々のブランチで作ると番号がぶつかる。

- スキーマ（`src/db/schema.ts`）の変更とマイグレーションの生成は、DB 担当が行う。ほかの人が変えたいときは DB 担当に頼む。
- 自分のブランチで作ったマイグレーションが main とぶつかったら、自分のマイグレーションのファイルを消し、main を取り込んでから `make db-generate` で作り直す。
- ブランチを切り替えたら `make db-reset` で DB を作り直す（前のブランチのテーブルが残るため）。

## ローカルでの member / admin

ローカルには Cloudflare Access がないので、`.env.local` の `DEV_STAFF_EMAIL` のメールでログインしたことにする。
admin で試すときは `DEV_STAFF_EMAIL` を `ADMIN_EMAIL` と同じにして、`make restart` する。
この仕組みは `next dev` のときだけ効き、Vercel のデプロイでは効かない。

## 環境変数

一覧は `.env.example`。ローカルの値は `make setup`（または `make env`）が `.env.local` に書く。
本番・プレビューの値は Vercel の環境変数に入っている。

- `vercel env pull` を使うときは、`.env.local` に上書きしない（ローカルの Supabase の値が消える）。`vercel env pull .env.vercel` のように別のファイルに出す。

## 気をつけること

- **ローカルの Supabase は、同じネットワークのほかの PC から開ける。** Supabase CLI が DB（54322）や Studio（54323）をすべてのネットワークで公開するため。会場の Wi-Fi などでは、PC のファイアウォールを有効にする（macOS：システム設定 → ネットワーク → ファイアウォール。Windows：ネットワークを「パブリック」にする）。ローカルでは本物の個人情報や写真を使わない。
- **ポート 3000 が埋まっているとき**は、`.env.local` の `APP_PORT` を変えて `make restart` する。
- **ほかのプロジェクトの Supabase が動いていて `make up` が失敗するとき**（ポート 54321〜54324 がぶつかる）は、`npx supabase stop --project-id <そのプロジェクトの名前>` で止める（名前は `docker ps` の `supabase_db_<名前>` で分かる）。
