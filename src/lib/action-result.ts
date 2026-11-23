// Server Action の返り値。フォームの部品は ok を見て、失敗なら message と fieldErrors を表示する。
// fieldErrors のキーは入力の項目名（例：{ foundPlace: "場所を選んでください" }）
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | {
      ok: false;
      message: string;
      fieldErrors?: Partial<Record<string, string>>;
    };
