#!/usr/bin/env bash
set -euo pipefail

# ローカルの Supabase はホストで動いている（`supabase start`）。
# ブラウザとサーバーで同じ URL（http://127.0.0.1:54321）を使えるように、
# コンテナの 127.0.0.1 の API（54321）と DB（54322）をホストへ転送する。
for port in 54321 54322; do
  socat "TCP-LISTEN:$port,fork,reuseaddr,bind=127.0.0.1" "TCP:host.docker.internal:$port" &
done

# 転送が待ち受けを始めてからコマンドを動かす（make db-migrate などがつなげずに失敗しないように）
for port in 54321 54322; do
  for _ in $(seq 50); do
    (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null && break
    sleep 0.1
  done
done

# 依存はコンテナの中（node_modules のボリューム）に入れる。
# lockfile が前回の install から変わったときだけ入れ直す。
lock_hash=$(cat pnpm-lock.yaml pnpm-workspace.yaml | sha256sum | cut -d' ' -f1)
if [ "$(cat node_modules/.lock-hash 2>/dev/null)" != "$lock_hash" ]; then
  pnpm install --frozen-lockfile --store-dir /pnpm-store
  echo "$lock_hash" >node_modules/.lock-hash
fi

exec "$@"
