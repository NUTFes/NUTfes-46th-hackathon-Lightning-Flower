// 画面に出す番号。DB の number（連番）を「拾-00042」「申-00118」の形にする
// （採番ルールは未決。決まったらここだけ変える）。
const pad = (n: number) => String(n).padStart(5, "0");

export const formatFoundNumber = (n: number) => `拾-${pad(n)}`;
export const formatLostNumber = (n: number) => `申-${pad(n)}`;
