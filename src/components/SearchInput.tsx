"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { SearchField, type SearchFieldProps } from "./SearchField";

type SearchInputProps = Omit<SearchFieldProps, "value" | "onChange"> & {
  defaultValue?: string;
  onSearch: (query: string) => void;
  debounceMs?: number;
};

export function SearchInput({
  defaultValue = "",
  onSearch,
  debounceMs = 300,
  ...fieldProps
}: SearchInputProps) {
  const [text, setText] = useState(defaultValue);
  const lastSearch = useRef(defaultValue);
  const notify = useEffectEvent(onSearch);

  useEffect(() => {
    const query = text.trim();
    if (query === lastSearch.current.trim()) return;
    const timeout = setTimeout(
      () => {
        lastSearch.current = query;
        notify(query);
      },
      Math.max(0, debounceMs),
    );
    return () => clearTimeout(timeout);
  }, [text, debounceMs]);

  return <SearchField {...fieldProps} value={text} onChange={setText} />;
}
