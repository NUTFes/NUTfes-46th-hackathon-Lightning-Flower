#!/usr/bin/env bash
# .env.example をもとに .env.local を作り、ローカルの Supabase の URL とキーを入れる。
# すでに .env.local があれば、Supabase の値だけを書き直す（ほかの行はそのまま）。
set -euo pipefail

cd "$(dirname "$0")/.."

supabase=${SUPABASE:-"npx --yes supabase"}
status=$($supabase status -o env 2>/dev/null) || {
  echo "ローカルの Supabase が動いていません。先に make supabase-start を実行してください" >&2
  exit 1
}

value() {
  echo "$status" | sed -n "s/^$1=\"\{0,1\}\([^\"]*\)\"\{0,1\}$/\1/p"
}

[ -f .env.local ] || cp .env.example .env.local

set_env() {
  local key=$1 val=$2
  if grep -q "^$key=" .env.local; then
    # 値に / が入るので区切りは |
    sed -i.bak "s|^$key=.*|$key=$val|" .env.local && rm .env.local.bak
  else
    echo "$key=$val" >>.env.local
  fi
}

set_env NEXT_PUBLIC_SUPABASE_URL "$(value API_URL)"
set_env NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY "$(value PUBLISHABLE_KEY)"
set_env SUPABASE_SECRET_KEY "$(value SECRET_KEY)"
set_env DATABASE_URL "$(value DB_URL)"

echo ".env.local にローカルの Supabase の値を書きました"
