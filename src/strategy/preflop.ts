/**
 * Mani iniziali: lettura della tabella generata da scripts/holdem/preflop-equity.ts.
 *
 * `handRank(label)` restituisce la frazione di combinazioni almeno altrettanto forti
 * (0,02 = top 2 %), calcolata sull'equity heads-up contro carte casuali.
 * I range "top X %" dei bot si costruiscono su questo ordinamento.
 */
import table from "../../data/holdem/preflop-equity.json";
import { holeCardsLabel, type Card } from "../engine/cards/card";

type Key = "vs1" | "vs2" | "vs5";

const byHand = new Map(table.hands.map((h) => [h.hand, h]));

export function preflopEquity(label: string, opponents: 1 | 2 | 5): number {
  const row = byHand.get(label);
  if (!row) throw new Error(`Mano sconosciuta: ${label}`);
  return row.equity[`vs${opponents}` as Key]!;
}

/** Frazione di combos (su 1 326) con equity heads-up ≥ questa mano. Più basso = più forte. */
export function handTopPercent(label: string, key: "vs1" | "vs5" = "vs1"): number {
  const v = (table.topPercent[key] as Record<string, number>)[label];
  if (v === undefined) throw new Error(`Mano sconosciuta: ${label}`);
  return v;
}

export function holeCardsTopPercent(a: Card, b: Card, key: "vs1" | "vs5" = "vs1"): number {
  return handTopPercent(holeCardsLabel(a, b), key);
}

/** Metadati della tabella, per le lezioni ("generata il…, N campioni per mano"). */
export const PREFLOP_TABLE_META = {
  generatedAt: table.generatedAt,
  samplesPerHand: table.samplesPerHand,
  method: table.method,
};
