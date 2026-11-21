#!/usr/bin/env bash
set -euo pipefail

# --- root で行う準備 ---------------------------------------------------------
# （OrbStack では /app の持ち主が root に見えるので、uid ではなく印で 1 回目かどうかを見分ける）
if [ -z "${ENTRYPOINT_PREPARED:-}" ]; then
  # /app はホストのチェックアウトを bind mount したもの。コンテナが作るファイル
  # （マイグレーション・openapi.yaml など）がホストで root の持ち物にならないように、
  # /app の持ち主の uid で動かす（WSL・Linux では 1000 など。macOS では変換される）。
  APP_UID=$(stat -c '%u' /app)
  APP_GID=$(stat -c '%g' /app)

  # named volume と HOME は、その uid が書けるようにする
  chown "$APP_UID:$APP_GID" /app/node_modules /app/.next /pnpm-store
  export HOME=/home/node
  chown "$APP_UID:$APP_GID" "$HOME"

  # ローカルの Supabase は、Supabase CLI がホストの Docker で動かしている。
  # ブラウザとサーバーで同じ URL（.env.local の NEXT_PUBLIC_SUPABASE_URL・DATABASE_URL）を
  # 使えるように、コンテナの 127.0.0.1 のそのポートを、Supabase のコンテナへ転送する。
  # 転送先はコンテナ名で指すので、Docker Desktop・OrbStack・WSL の Docker Engine で同じ経路になる。
  if [ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" ] || [ -z "${DATABASE_URL:-}" ]; then
    echo "警告: .env.local に NEXT_PUBLIC_SUPABASE_URL と DATABASE_URL がありません。make env を実行してください" >&2
  else
    api_port=$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed -E 's#^.*:([0-9]+).*$#\1#')
    db_port=$(echo "$DATABASE_URL" | sed -E 's#^.*@[^:/]+:([0-9]+)/.*$#\1#')
    project=${SUPABASE_PROJECT_ID:-otoshiru}
    socat "TCP-LISTEN:$api_port,fork,reuseaddr,bind=127.0.0.1" "TCP:supabase_kong_$project:8000" &
    socat "TCP-LISTEN:$db_port,fork,reuseaddr,bind=127.0.0.1" "TCP:supabase_db_$project:5432" &

    # 転送が待ち受けを始めてからコマンドを動かす（make db-migrate などがつなげずに失敗しないように）
    for port in "$api_port" "$db_port"; do
      for _ in $(seq 50); do
        (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null && break
        sleep 0.1
      done
    done
  fi

  # ここから先は /app の持ち主の uid で動かす
  export ENTRYPOINT_PREPARED=1
  exec setpriv --reuid="$APP_UID" --regid="$APP_GID" --clear-groups -- "$0" "$@"
fi

# --- /app の持ち主の uid で行う準備 -------------------------------------------
# 依存はコンテナの中（node_modules のボリューム）に入れる。
# lockfile が前回の install から変わったときだけ入れ直す。
# 複数のコンテナ（make up と make check など）が同時に入れないように、ロックを取る。
lock_hash=$(cat pnpm-lock.yaml pnpm-workspace.yaml | sha256sum | cut -d' ' -f1)
(
  flock 9
  if [ "$(cat node_modules/.lock-hash 2>/dev/null)" != "$lock_hash" ]; then
    pnpm install --frozen-lockfile
    echo "$lock_hash" >node_modules/.lock-hash
  fi
) 9>node_modules/.install.lock

exec "$@"
