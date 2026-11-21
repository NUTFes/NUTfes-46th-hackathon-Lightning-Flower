# ローカル開発のコマンド。`make help` で一覧を出す。
# Supabase はホストの Docker で動かし（Supabase CLI が自分でコンテナを立てるため）、
# アプリ（Next.js）は compose.yaml の app コンテナで動かす。

# Supabase CLI の版は package.json の devDependencies と揃える
SUPABASE := npx --yes supabase@3.2.0
APP := docker compose run --rm app

.DEFAULT_GOAL := help
.PHONY: help setup up down restart logs sh supabase-start supabase-stop supabase-status \
	env db-generate db-migrate db-reset db-studio check format openapi

help: ## コマンドの一覧
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "} {printf "  make %-16s %s\n", $$1, $$2}'

setup: supabase-start env ## 最初の 1 回：Supabase を起動し、.env.local を作り、イメージをビルドする
	docker compose build
	$(APP) true
	@echo "準備ができました。make up で起動します"

up: supabase-start ## Supabase とアプリを起動する（http://localhost:3000）
	docker compose up -d
	@echo "アプリ: http://localhost:$${APP_PORT:-3000}  Supabase Studio: http://127.0.0.1:54323"

down: ## アプリと Supabase を止める
	docker compose down
	$(SUPABASE) stop

restart: ## アプリだけ作り直して起動する（.env.local を変えたあと）
	docker compose up -d --force-recreate app

logs: ## アプリのログを見る
	docker compose logs -f app

sh: ## アプリのコンテナに入る
	docker compose exec app bash

supabase-start: ## Supabase だけ起動する
	$(SUPABASE) start

supabase-stop: ## Supabase だけ止める
	$(SUPABASE) stop

supabase-status: ## Supabase の URL とキーを表示する
	$(SUPABASE) status

env: ## .env.local にローカルの Supabase の値を書く
	SUPABASE="$(SUPABASE)" ./scripts/setup-env.sh

db-generate: ## src/db/schema.ts からマイグレーションを作る
	$(APP) pnpm db:generate

db-migrate: ## マイグレーションをローカルの DB に当てる
	$(APP) pnpm db:migrate

db-reset: ## ローカルの DB を空にして、マイグレーションを当て直す
	$(SUPABASE) db reset
	$(APP) pnpm db:migrate

db-studio: ## Supabase Studio を開く（テーブルの中身を見る）
	open http://127.0.0.1:54323

check: ## 型チェック・Lint・整形・テスト（CI と同じ）
	$(APP) pnpm check

format: ## Prettier で整形する
	$(APP) pnpm format

openapi: ## zod スキーマから openapi.yaml を出す
	$(APP) pnpm openapi
