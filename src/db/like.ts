// LIKE / ILIKE の部分一致で、ユーザーの入力に含まれる % _ \ を文字としてそのまま探す
export function containsPattern(input: string) {
  return `%${input.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}
