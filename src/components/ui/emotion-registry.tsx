"use client";

import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { useServerInsertedHTML } from "next/navigation";
import { useState, type ReactNode } from "react";

// Chakra UI（Emotion）のスタイルを、サーバーでは <head> に入れる（Chakra UI の Next.js App Router のガイドの EmotionRegistry）。
// これがないと、Emotion がサーバーで <style data-emotion="css-global …"> を body の中に書き、
// クライアント（Turbopack）ではそこに next-themes の <script> が来るので、hydration が失敗する
export function EmotionRegistry({ children }: { children: ReactNode }) {
  const [{ cache, flush }] = useState(() => {
    const cache = createCache({ key: "css" });
    // サーバーで <style> を要素の隣に書かず、cache.inserted に貯める（下の useServerInsertedHTML で出す）
    cache.compat = true;
    const prevInsert = cache.insert;
    let inserted: string[] = [];
    cache.insert = (...args) => {
      const serialized = args[1];
      if (cache.inserted[serialized.name] === undefined) {
        inserted.push(serialized.name);
      }
      return prevInsert(...args);
    };
    const flush = () => {
      const prev = inserted;
      inserted = [];
      return prev;
    };
    return { cache, flush };
  });

  useServerInsertedHTML(() => {
    const names = flush();
    if (names.length === 0) return null;
    let styles = "";
    for (const name of names) {
      const rules = cache.inserted[name];
      if (typeof rules === "string") styles += rules;
    }
    return (
      <style
        key={cache.key}
        data-emotion={`${cache.key} ${names.join(" ")}`}
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    );
  });

  return <CacheProvider value={cache}>{children}</CacheProvider>;
}
