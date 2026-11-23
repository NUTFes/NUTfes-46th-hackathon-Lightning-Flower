"use client";

import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { useServerInsertedHTML } from "next/navigation";
import { Fragment, useState, type ReactNode } from "react";

// Chakra UI（Emotion）のスタイルを、サーバーでは <head> に入れる（Chakra UI の Next.js App Router のガイドの EmotionRegistry）。
// これがないと、Emotion がサーバーで <style data-emotion="css-global …"> を body の中に書き、
// クライアント（Turbopack）ではそこに next-themes の <script> が来るので、hydration が失敗する
export function EmotionRegistry({ children }: { children: ReactNode }) {
  const [{ cache, flush }] = useState(() => {
    const cache = createCache({ key: "css" });
    // サーバーで <style> を要素の隣に書かず、cache.inserted に貯める（下の useServerInsertedHTML で出す）
    cache.compat = true;
    const prevInsert = cache.insert;
    // <Global>（selector が空）と、ふつうのスタイルを分けて貯める
    let inserted: { name: string; isGlobal: boolean }[] = [];
    cache.insert = (...args) => {
      const [selector, serialized] = args;
      // 貯めたものを出すのはサーバーだけ（クライアントでは flush しないので貯めない）
      if (
        typeof window === "undefined" &&
        cache.inserted[serialized.name] === undefined
      ) {
        inserted.push({ name: serialized.name, isGlobal: !selector });
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
    const entries = flush();
    if (entries.length === 0) return null;
    const rulesOf = (name: string) => {
      const rules = cache.inserted[name];
      return typeof rules === "string" ? rules : "";
    };
    // <Global> は 1 つずつ data-emotion="css-global <名前>" で出す。クライアントの <Global> が
    // このタグを見つけて使い回すので、同じ CSS がもう一度入らない
    const globals = entries.filter((entry) => entry.isGlobal);
    const names = entries
      .filter((entry) => !entry.isGlobal)
      .map((entry) => entry.name);
    return (
      <Fragment>
        {globals.map(({ name }) => (
          <style
            key={name}
            data-emotion={`${cache.key}-global ${name}`}
            dangerouslySetInnerHTML={{ __html: rulesOf(name) }}
          />
        ))}
        {names.length > 0 && (
          <style
            data-emotion={`${cache.key} ${names.join(" ")}`}
            dangerouslySetInnerHTML={{ __html: names.map(rulesOf).join("") }}
          />
        )}
      </Fragment>
    );
  });

  return <CacheProvider value={cache}>{children}</CacheProvider>;
}
