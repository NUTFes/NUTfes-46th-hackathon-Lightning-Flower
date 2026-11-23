// Server Action の返り値。画面の部品は ok を見て、失敗なら error と fieldErrors を表示する。
// fieldErrors のキーは入力の項目名（例：{ foundPlace: "場所を選んでください" }）。
// 返す値がない action は ActionResult、ある action は ActionResult<{ id: string }> のように書く
export type ActionFailure = {
  ok: false;
  error: string;
  fieldErrors?: Partial<Record<string, string>>;
};

export type ActionResult<T = void> =
  ([T] extends [void] ? { ok: true } : { ok: true; data: T }) | ActionFailure;
