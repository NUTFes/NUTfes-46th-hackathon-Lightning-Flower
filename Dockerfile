# ローカル開発用のイメージ（本番は Vercel なので使わない）。
# Node.js の版は .node-version・mise.toml と揃える。
FROM node:24-bookworm-slim

# socat：コンテナの 127.0.0.1 に来た Supabase あての通信を、Supabase のコンテナへ転送する（docker/entrypoint.sh）
RUN apt-get update \
  && apt-get install -y --no-install-recommends socat \
  && rm -rf /var/lib/apt/lists/*

# pnpm（corepack）とそのキャッシュは、どのユーザーで動かしても読める場所に置く
# （entrypoint がホストのファイルの持ち主の uid に切り替えて動かすため）。
# pnpm のストアは名前付きボリュームの /pnpm-store に固定する（コンテナの中の pnpm add もここを使う）
ENV COREPACK_HOME=/usr/local/corepack \
  XDG_CACHE_HOME=/usr/local/cache \
  COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
  pnpm_config_store_dir=/pnpm-store
RUN corepack enable pnpm

WORKDIR /app
# package.json の packageManager に書いた版の pnpm を、イメージに入れておく
# （pnpm 12 は初回の実行でネイティブのバイナリを取りに行くので、ここで済ませる）
COPY package.json ./
RUN corepack install && pnpm --version \
  && chmod -R a+rwX /usr/local/corepack /usr/local/cache

# node_modules・.next・pnpm のストアは名前付きボリュームで上書きされる。持ち主は entrypoint で直す
RUN mkdir -p /app/node_modules /app/.next /pnpm-store

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
ENTRYPOINT ["entrypoint.sh"]
# コンテナの中では全インターフェースで待ち受ける（ホスト側は compose.yaml で 127.0.0.1 に限る）
CMD ["pnpm", "exec", "next", "dev", "-H", "0.0.0.0"]
