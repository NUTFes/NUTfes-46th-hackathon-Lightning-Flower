# ローカル開発用のイメージ（本番は Vercel なので使わない）。
# Node.js の版は .node-version と揃える。
FROM node:24-bookworm-slim

# socat：コンテナの 127.0.0.1 に来た Supabase あての通信を、ホストへ転送する（docker/entrypoint.sh）
RUN apt-get update \
  && apt-get install -y --no-install-recommends socat \
  && rm -rf /var/lib/apt/lists/*

# package.json の packageManager に書いた版の pnpm を、イメージに入れておく
RUN corepack enable pnpm
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

WORKDIR /app
COPY package.json ./
# pnpm 12 は初回の実行でネイティブのバイナリを取りに行くので、ここで済ませる
RUN corepack install && pnpm --version

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
ENTRYPOINT ["entrypoint.sh"]
# コンテナの中では全インターフェースで待ち受ける（ホスト側は compose.yaml で 127.0.0.1 に限る）
CMD ["pnpm", "exec", "next", "dev", "-H", "0.0.0.0"]
