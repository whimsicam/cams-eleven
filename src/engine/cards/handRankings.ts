/**
 * Classifica dei punti del Texas Hold'em, dal più forte al più debole, con un esempio per ciascuno,
 * e il punto che ha l'utente in questo momento (anche con meno di 5 carte, cioè al preflop).
 *
 * Gli esempi sono verificati in tests/engine/handRankings.test.ts: ognuno, valutato
 * dall'evaluator, deve dare proprio la categoria dichiarata.
 */
import { rankOf, RANK_ACE, type Card } from "./card";
import { categoryOf, describeHand, evaluate, HAND_CATEGORY, kickersOf } from "./evaluator";

/** Categoria della classifica: le 9 dell'evaluator più la scala reale (id 9) tenuta a parte. */
export type RankingId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export const ROYAL_FLUSH: RankingId = 9;

export interface RankingEntry {
  id: RankingId;
  /** Nome inglese (termine tecnico) */
  name: string;
  /** Nome italiano, per chi gioca dal vivo con gli amici */
  nameIt: string;
  /** Esempio in notazione compatta, 5 carte */
  example: string;
  /** Spiegazione breve */
  text: string;
}

/** Dal più forte al più debole. */
export const HAND_RANKINGS: readonly RankingEntry[] = [
  { id: 9, name: "Royal flush", nameIt: "Scala reale", example: "As Ks Qs Js Ts", text: "Dal 10 all'Asso, tutte dello stesso seme." },
  { id: 8, name: "Straight flush", nameIt: "Scala colore", example: "9h 8h 7h 6h 5h", text: "Cinque carte in fila dello stesso seme." },
  { id: 7, name: "Four of a kind", nameIt: "Poker", example: "Qc Qd Qh Qs 7d", text: "Quattro carte dello stesso valore." },
  { id: 6, name: "Full house", nameIt: "Full", example: "Kh Kd Ks 4c 4h", text: "Un tris più una coppia." },
  { id: 5, name: "Flush", nameIt: "Colore", example: "Ad Jd 8d 6d 2d", text: "Cinque carte dello stesso seme, non in fila." },
  { id: 4, name: "Straight", nameIt: "Scala", example: "Tc 9d 8s 7h 6c", text: "Cinque carte in fila, semi misti. L'Asso vale anche come 1 (A-2-3-4-5)." },
  { id: 3, name: "Three of a kind", nameIt: "Tris", example: "7s 7h 7d Kc 2s", text: "Tre carte dello stesso valore." },
  { id: 2, name: "Two pair", nameIt: "Doppia coppia", example: "Jh Jc 5s 5d Ah", text: "Due coppie diverse." },
  { id: 1, name: "Pair", nameIt: "Coppia", example: "9c 9s Ad Th 4s", text: "Due carte dello stesso valore." },
  { id: 0, name: "High card", nameIt: "Carta alta", example: "Ah Js 8d 5c 3h", text: "Niente di quanto sopra: conta la carta più alta." },
];

/** Categoria di classifica di uno score dell'evaluator (separa la scala reale). */
export function rankingIdOf(score: number): RankingId {
  const cat = categoryOf(score);
  if (cat === HAND_CATEGORY.STRAIGHT_FLUSH && kickersOf(score)[0] === RANK_ACE) return ROYAL_FLUSH;
  return cat as RankingId;
}

const RANK_IT = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"] as const;

/**
 * Il punto migliore con le carte note (le tue 2 + il board).
 * Con 5–7 carte usa l'evaluator; con meno (preflop) guarda solo coppie e carta alta,
 * perché scala e colore richiedono 5 carte.
 */
export function currentHand(cards: readonly Card[]): { id: RankingId; label: string } | null {
  if (cards.length === 0) return null;
  if (cards.length >= 5) {
    const score = evaluate(cards);
    return { id: rankingIdOf(score), label: describeHand(score) };
  }
  const counts = new Array<number>(13).fill(0);
  for (const c of cards) counts[rankOf(c)]!++;
  const ranksBy = (n: number) => counts.map((k, r) => (k === n ? r : -1)).filter((r) => r >= 0).sort((a, b) => b - a);
  const quads = ranksBy(4), trips = ranksBy(3), pairs = ranksBy(2);
  if (quads.length) return { id: 7, label: `Poker di ${RANK_IT[quads[0]!]}` };
  if (trips.length) return { id: 3, label: `Tris di ${RANK_IT[trips[0]!]}` };
  if (pairs.length >= 2) return { id: 2, label: `Doppia coppia, ${RANK_IT[pairs[0]!]} e ${RANK_IT[pairs[1]!]}` };
  if (pairs.length === 1) return { id: 1, label: `Coppia di ${RANK_IT[pairs[0]!]}` };
  const high = Math.max(...cards.map(rankOf));
  return { id: 0, label: `Carta alta ${RANK_IT[high]}` };
}
