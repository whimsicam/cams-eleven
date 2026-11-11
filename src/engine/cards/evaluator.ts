/**
 * Hand evaluator per 5–7 carte (Hold'em e poker a 5 carte con mazzo da 52).
 *
 * Ritorna un intero: più alto = mano più forte. Mani di pari valore ritornano
 * lo stesso intero (split pot). Codifica:
 *   categoria (0..8) << 20 | k1 << 16 | k2 << 12 | k3 << 8 | k4 << 4 | k5
 * dove k1..k5 sono i rank (0..12, +1 per lasciare 0 = "nessuno") che decidono gli spareggi,
 * in ordine di importanza. Es. full house: k1 = rank del tris, k2 = rank della coppia.
 *
 * Approccio: conteggi per rank e per seme, lettura diretta delle categorie,
 * senza enumerare le 21 combinazioni di 5 carte. È O(n) e abbastanza veloce
 * per il Monte Carlo nel browser (centinaia di migliaia di valutazioni al secondo).
 *
 * Correttezza: tests/engine/evaluator.test.ts enumera tutte le 2 598 960 mani
 * da 5 carte e confronta i conteggi per categoria con i valori noti.
 *
 * Nota per il poker all'italiana (Fase 6): mazzo ridotto, colore > full e
 * gerarchia dei semi: servirà un evaluator separato in src/engine/draw/.
 */
import { rankOf, suitOf, type Card, RANK_ACE } from "./card";

export const HAND_CATEGORY = {
  HIGH_CARD: 0,
  PAIR: 1,
  TWO_PAIR: 2,
  THREE_OF_A_KIND: 3,
  STRAIGHT: 4,
  FLUSH: 5,
  FULL_HOUSE: 6,
  FOUR_OF_A_KIND: 7,
  STRAIGHT_FLUSH: 8,
} as const;

export type HandCategory = (typeof HAND_CATEGORY)[keyof typeof HAND_CATEGORY];

/** Nomi in italiano per la UI (l'indice è la categoria). Royal flush è una straight flush con k1 = Asso. */
export const HAND_CATEGORY_NAMES_IT = [
  "Carta alta",
  "Coppia",
  "Doppia coppia",
  "Tris",
  "Scala",
  "Colore",
  "Full house",
  "Poker",
  "Scala colore",
] as const;

export const HAND_CATEGORY_NAMES_EN = [
  "High card",
  "Pair",
  "Two pair",
  "Three of a kind",
  "Straight",
  "Flush",
  "Full house",
  "Four of a kind",
  "Straight flush",
] as const;

export function categoryOf(score: number): HandCategory {
  return (score >>> 20) as HandCategory;
}

/** I kicker (rank 0..12) codificati nello score, in ordine di importanza. */
export function kickersOf(score: number): number[] {
  const out: number[] = [];
  for (let shift = 16; shift >= 0; shift -= 4) {
    const k = (score >>> shift) & 0xf;
    if (k === 0) break;
    out.push(k - 1);
  }
  return out;
}

/** Se la maschera dei rank (bit r = rank r presente) contiene una scala, ritorna il rank più alto, altrimenti -1. */
function straightHigh(rankMask: number): number {
  // Controlla ogni finestra di 5 rank consecutivi, dalla più alta.
  for (let high = RANK_ACE; high >= 4; high--) {
    const window = 0b11111 << (high - 4);
    if ((rankMask & window) === window) return high;
  }
  // Ruota: A 2 3 4 5 → scala col 5 alto.
  if ((rankMask & (1 << RANK_ACE)) && (rankMask & 0b1111) === 0b1111) return 3;
  return -1;
}

function pack(category: number, k1 = -1, k2 = -1, k3 = -1, k4 = -1, k5 = -1): number {
  return (
    (category << 20) |
    ((k1 + 1) << 16) |
    ((k2 + 1) << 12) |
    ((k3 + 1) << 8) |
    ((k4 + 1) << 4) |
    (k5 + 1)
  );
}

/** I n rank più alti presenti in una maschera, dal più alto. */
function topRanks(mask: number, n: number, out: number[] = []): number[] {
  for (let r = RANK_ACE; r >= 0 && out.length < n; r--) if (mask & (1 << r)) out.push(r);
  return out;
}

/**
 * Valuta la migliore mano di poker tra 5, 6 o 7 carte.
 */
export function evaluate(cards: readonly Card[]): number {
  const n = cards.length;
  if (n < 5 || n > 7) throw new Error(`evaluate: servono 5–7 carte, ricevute ${n}`);

  const rankCount = new Array<number>(13).fill(0);
  const suitCount = [0, 0, 0, 0];
  const suitMask = [0, 0, 0, 0]; // maschera dei rank per ogni seme
  let rankMask = 0;

  for (let i = 0; i < n; i++) {
    const c = cards[i]!;
    const r = rankOf(c), s = suitOf(c);
    rankCount[r]!++;
    suitCount[s]!++;
    suitMask[s]! |= 1 << r;
    rankMask |= 1 << r;
  }

  // Colore / scala colore
  for (let s = 0; s < 4; s++) {
    if (suitCount[s]! >= 5) {
      const sh = straightHigh(suitMask[s]!);
      if (sh >= 0) return pack(HAND_CATEGORY.STRAIGHT_FLUSH, sh);
      const top = topRanks(suitMask[s]!, 5);
      return pack(HAND_CATEGORY.FLUSH, top[0], top[1], top[2], top[3], top[4]);
    }
  }

  // Gruppi per molteplicità, dal rank più alto
  let quads = -1;
  let trips = -1, trips2 = -1;
  let pairHi = -1, pairLo = -1;
  for (let r = RANK_ACE; r >= 0; r--) {
    const c = rankCount[r]!;
    if (c === 4) quads = r;
    else if (c === 3) {
      if (trips < 0) trips = r;
      else if (trips2 < 0) trips2 = r;
    } else if (c === 2) {
      if (pairHi < 0) pairHi = r;
      else if (pairLo < 0) pairLo = r;
    }
  }

  if (quads >= 0) {
    const kicker = topRanks(rankMask & ~(1 << quads), 1)[0]!;
    return pack(HAND_CATEGORY.FOUR_OF_A_KIND, quads, kicker);
  }

  if (trips >= 0 && (pairHi >= 0 || trips2 >= 0)) {
    // Con 7 carte possono esserci due tris: il secondo fa da coppia.
    const pair = Math.max(pairHi, trips2);
    return pack(HAND_CATEGORY.FULL_HOUSE, trips, pair);
  }

  const sh = straightHigh(rankMask);
  if (sh >= 0) return pack(HAND_CATEGORY.STRAIGHT, sh);

  if (trips >= 0) {
    const k = topRanks(rankMask & ~(1 << trips), 2);
    return pack(HAND_CATEGORY.THREE_OF_A_KIND, trips, k[0], k[1]);
  }

  if (pairHi >= 0 && pairLo >= 0) {
    const kicker = topRanks(rankMask & ~(1 << pairHi) & ~(1 << pairLo), 1)[0]!;
    return pack(HAND_CATEGORY.TWO_PAIR, pairHi, pairLo, kicker);
  }

  if (pairHi >= 0) {
    const k = topRanks(rankMask & ~(1 << pairHi), 3);
    return pack(HAND_CATEGORY.PAIR, pairHi, k[0], k[1], k[2]);
  }

  const k = topRanks(rankMask, 5);
  return pack(HAND_CATEGORY.HIGH_CARD, k[0], k[1], k[2], k[3], k[4]);
}

/** Descrizione in italiano della mano, per coach e showdown. Es. "Full house, Re pieni di 7". */
export function describeHand(score: number): string {
  const cat = categoryOf(score);
  const k = kickersOf(score);
  const name = (r: number | undefined) => {
    if (r === undefined) return "?";
    return ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"][r]!;
  };
  switch (cat) {
    case HAND_CATEGORY.STRAIGHT_FLUSH:
      return k[0] === RANK_ACE ? "Scala reale" : `Scala colore al ${name(k[0])}`;
    case HAND_CATEGORY.FOUR_OF_A_KIND:
      return `Poker di ${name(k[0])}`;
    case HAND_CATEGORY.FULL_HOUSE:
      return `Full house, ${name(k[0])} pieni di ${name(k[1])}`;
    case HAND_CATEGORY.FLUSH:
      return `Colore al ${name(k[0])}`;
    case HAND_CATEGORY.STRAIGHT:
      return `Scala al ${name(k[0])}`;
    case HAND_CATEGORY.THREE_OF_A_KIND:
      return `Tris di ${name(k[0])}`;
    case HAND_CATEGORY.TWO_PAIR:
      return `Doppia coppia, ${name(k[0])} e ${name(k[1])}`;
    case HAND_CATEGORY.PAIR:
      return `Coppia di ${name(k[0])}`;
    default:
      return `Carta alta ${name(k[0])}`;
  }
}
