export function damerauLevenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const d: number[][] = [];
  for (let i = 0; i <= m; i++) { d[i] = []; d[i][0] = i; }
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
      d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + cost);
      if (i > 1 && j > 1 && a.charAt(i-1) === b.charAt(j-2) && a.charAt(i-2) === b.charAt(j-1)) {
        d[i][j] = Math.min(d[i][j], d[i-2][j-2] + 1);
      }
    }
  }
  return d[m][n];
}
// Balanced policy: <=1 typo up to 7 letters, <=2 from 8 letters on.
export function nearMissThreshold(len: number): number {
  return len >= 8 ? 2 : 1;
}
