import type { FileMap } from "./types";

/** Deterministic 40-char hex "SHA" built from FNV-1a so the same content always gets the same id. */
export function fakeSha(input: string): string {
  let out = "";
  for (let round = 0; round < 5; round++) {
    let h = 0x811c9dc5 ^ (round * 0x9e3779b1);
    const s = round + ":" + input;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    out += (h >>> 0).toString(16).padStart(8, "0");
  }
  return out;
}

export const short = (id: string) => id.slice(0, 7);

/** Split a command line into tokens, honouring single and double quotes. */
export function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let cur = "";
  let quote: string | null = null;
  let hasToken = false;
  for (const ch of input) {
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      hasToken = true;
    } else if (/\s/.test(ch)) {
      if (hasToken) tokens.push(cur);
      cur = "";
      hasToken = false;
    } else {
      cur += ch;
      hasToken = true;
    }
  }
  if (hasToken) tokens.push(cur);
  return tokens;
}

export function sameMap(a: FileMap, b: FileMap): boolean {
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => k in b && a[k] === b[k]);
}

export type DiffOp = { kind: "same" | "add" | "del"; text: string };

/** Minimal LCS line diff; files in the simulator are small so O(n*m) is fine. */
export function lineDiff(a: string, b: string): DiffOp[] {
  const A = a === "" ? [] : a.split("\n");
  const B = b === "" ? [] : b.split("\n");
  const dp: number[][] = Array.from({ length: A.length + 1 }, () => new Array(B.length + 1).fill(0));
  for (let i = A.length - 1; i >= 0; i--)
    for (let j = B.length - 1; j >= 0; j--)
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < A.length && j < B.length) {
    if (A[i] === B[j]) {
      ops.push({ kind: "same", text: A[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) ops.push({ kind: "del", text: A[i++] });
    else ops.push({ kind: "add", text: B[j++] });
  }
  while (i < A.length) ops.push({ kind: "del", text: A[i++] });
  while (j < B.length) ops.push({ kind: "add", text: B[j++] });
  return ops;
}

export function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
