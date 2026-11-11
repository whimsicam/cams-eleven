/** Formattazione numerica europea (virgola decimale, punto per le migliaia). */
const intFmt = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 });
const pctFmt = new Intl.NumberFormat("it-IT", { style: "percent", maximumFractionDigits: 1 });
const decFmt = new Intl.NumberFormat("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function fmtChips(n: number): string {
  return intFmt.format(n);
}

export function fmtPct(p: number): string {
  return pctFmt.format(p);
}

export function fmtDec(n: number): string {
  return decFmt.format(n);
}

/** +12 / −5 con segno tipografico. */
export function fmtSigned(n: number): string {
  if (n > 0) return `+${intFmt.format(n)}`;
  if (n < 0) return `−${intFmt.format(-n)}`;
  return "0";
}

/** Big blind con una cifra decimale: "12,5 bb". */
export function fmtBb(chips: number, bigBlind: number): string {
  return `${decFmt.format(chips / bigBlind)} bb`;
}
