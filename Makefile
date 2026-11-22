# ローカル開発のコマンド。`make help` で一覧を出す。macOS と Linux（WSL2）の両方で動く。
# Supabase はホストの Docker で動かし（Supabase CLI が自分でコンテナを立てるため）、
# アプリ（Next.js）は compose.yaml の app コンテナで動かす。

# Supabase CLI の版はここだけで決める
SUPABASE := npx --yes supabase@3.2.0
# APP_PORT などを .env.local から読む
COMPOSE := docker compose --env-file .env.local
APP := $(COMPOSE) run --rm app
# 依存を足し引きしたあとは、entrypoint の「lockfile が変わったときだけ入れ直す」記録を消す
# （消さないと、lockfile を元に戻したときに入れ直されず、node_modules と食い違う）
FORGET_INSTALL := rm -f node_modules/.lock-hash

.DEFAULT_GOAL := help
.PHONY: help setup up down restart logs sh add add-dev remove supabase-start supabase-stop \
	supabase-status supabase-running env db-generate db-custom db-migrate db-reset db-studio check format openapi

help: ## コマンドの一覧
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "} {printf "  make %-16s %s\n", $$1, $$2}'

.env.local:
	@echo ".env.local がありません。先に make setup を実行してください" >&2
	@exit 1

# アプリのコンテナは Supabase の Docker ネットワークにつなぐので、Supabase が動いている必要がある
supabase-running: .env.local
	@docker network inspect supabase_network_otoshiru >/dev/null 2>&1 \
		|| { echo "Supabase が動いていません。先に make supabase-start を実行してください" >&2; exit 1; }

setup: supabase-start env ## 最初の 1 回：Supabase を起動し、.env.local を作り、イメージを作って依存を入れる
	$(COMPOSE) build
	$(APP) true
	@echo "準備ができました。make up で起動します"

up: supabase-start supabase-running ## Supabase とアプリを起動する（依存が変わっていれば入れ直す）
	$(APP) true
	$(COMPOSE) up -d --force-recreate app
	@echo "アプリ: http://localhost:$$(sed -n 's/^APP_PORT=//p' .env.local | grep . || echo 3000)  Supabase Studio: http://127.0.0.1:54323"

down: ## アプリと Supabase を止める
	-$(COMPOSE) down
	$(SUPABASE) stop

restart: supabase-running ## アプリだけ作り直して起動する（.env.local を変えたあと）
	$(COMPOSE) up -d --force-recreate app

logs: .env.local ## アプリのログを見る
	$(COMPOSE) logs -f app

sh: .env.local ## アプリのコンテナに入る（make up で起動しているとき）
	$(COMPOSE) exec app bash -c 'exec setpriv --reuid=$$(stat -c %u /app) --regid=$$(stat -c %g /app) --clear-groups env HOME=/home/node bash'

add: supabase-running ## 依存を足す（例：make add PKG="dayjs"）
	$(APP) bash -c 'pnpm add $(PKG) && $(FORGET_INSTALL)'
	@echo "エディタの補完のために、ホストでも pnpm install を実行してください"

add-dev: supabase-running ## 開発用の依存を足す（例：make add-dev PKG="@types/foo"）
	$(APP) bash -c 'pnpm add -D $(PKG) && $(FORGET_INSTALL)'
	@echo "エディタの補完のために、ホストでも pnpm install を実行してください"

remove: supabase-running ## 依存を消す（例：make remove PKG="dayjs"）
	$(APP) bash -c 'pnpm remove $(PKG) && $(FORGET_INSTALL)'

supabase-start: ## Supabase だけ起動する
	$(SUPABASE) start

supabase-stop: ## Supabase だけ止める
	$(SUPABASE) stop

supabase-status: ## Supabase の URL とキーを表示する
	$(SUPABASE) status

env: ## .env.local にローカルの Supabase の値を書く
	SUPABASE="$(SUPABASE)" ./scripts/setup-env.sh

db-generate: supabase-running ## src/db/schema.ts からマイグレーションを作る（例：make db-generate NAME=add_areas）
	$(APP) pnpm db:generate $(if $(NAME),--name $(NAME))

db-custom: supabase-running ## 中身を手で書く空のマイグレーションを作る（データの投入など。例：make db-custom NAME=seed_areas）
	$(APP) pnpm db:generate --custom --name $(NAME)

db-migrate: supabase-running ## マイグレーションをローカルの DB に当てる
	$(APP) pnpm db:migrate

db-reset: supabase-running ## ローカルの DB を空にしてマイグレーションを当て直す（ブランチを切り替えたあとにも）
	$(SUPABASE) db reset
	$(APP) pnpm db:migrate

db-studio: ## Supabase Studio（テーブルの中身を見る画面）を開く
	@url=http://127.0.0.1:54323; echo "$$url"; \
	if [ "$$(uname)" = Darwin ]; then open "$$url"; \
	elif command -v wslview >/dev/null; then wslview "$$url"; \
	elif command -v xdg-open >/dev/null; then xdg-open "$$url"; fi

check: supabase-running ## 型チェック・Lint・整形・テスト（CI はこれに加えて build と openapi.yaml の確認もする）
	$(APP) pnpm check

format: supabase-running ## Prettier で整形する
	$(APP) pnpm format

openapi: supabase-running ## zod スキーマから openapi.yaml を出す
	$(APP) pnpm openapi
