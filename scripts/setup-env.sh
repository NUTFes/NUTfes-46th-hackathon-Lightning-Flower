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
  # CLI の版が変わってキーの名前が変わると空になる。空のまま書かずに止める
  if [ -z "$val" ]; then
    echo "supabase status から $key の値を取れませんでした（CLI の出力の形が変わったかもしれません）" >&2
    exit 1
  fi
  # 値に & や | が入っても壊れないように、sed ではなく awk に環境変数で渡す
  VAL="$val" awk -v key="$key" '
    BEGIN { val = ENVIRON["VAL"] }
    index($0, key "=") == 1 { print key "=" val; done = 1; next }
    { print }
    END { if (!done) print key "=" val }
  ' .env.local >.env.local.tmp
  mv .env.local.tmp .env.local
}

set_env NEXT_PUBLIC_SUPABASE_URL "$(value API_URL)"
set_env NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY "$(value PUBLISHABLE_KEY)"
set_env SUPABASE_SECRET_KEY "$(value SECRET_KEY)"
set_env DATABASE_URL "$(value DB_URL)"

echo ".env.local にローカルの Supabase の値を書きました"
