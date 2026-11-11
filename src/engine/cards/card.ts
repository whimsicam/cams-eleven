/**
 * Rappresentazione delle carte.
 *
 * Una carta è un intero 0..51: rank = card % 13 (0 = Due … 12 = Asso),
 * suit = Math.floor(card / 13) (0 = fiori ♣, 1 = quadri ♦, 2 = cuori ♥, 3 = picche ♠).
 * Gli interi rendono evaluator e simulazioni veloci; la UI converte in simboli.
 */

export type Card = number;

export const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"] as const;
export const SUITS = ["c", "d", "h", "s"] as const;
export const SUIT_SYMBOLS = ["♣", "♦", "♥", "♠"] as const;
/** Nomi italiani dei semi, nell'ordine di SUITS. */
export const SUIT_NAMES_IT = ["fiori", "quadri", "cuori", "picche"] as const;

export const RANK_TWO = 0;
export const RANK_ACE = 12;

export function rankOf(card: Card): number {
  return card % 13;
}

export function suitOf(card: Card): number {
  return Math.floor(card / 13);
}

export function makeCard(rank: number, suit: number): Card {
  if (rank < 0 || rank > 12 || suit < 0 || suit > 3) throw new Error(`Carta non valida: rank ${rank}, suit ${suit}`);
  return suit * 13 + rank;
}

/** "Ah" → carta. Accetta T o 10 per il dieci. */
export function parseCard(text: string): Card {
  const t = text.trim().replace(/^10/, "T");
  if (t.length !== 2) throw new Error(`Carta non riconosciuta: "${text}"`);
  const r = RANKS.indexOf(t[0]!.toUpperCase() as (typeof RANKS)[number]);
  const s = SUITS.indexOf(t[1]!.toLowerCase() as (typeof SUITS)[number]);
  if (r < 0 || s < 0) throw new Error(`Carta non riconosciuta: "${text}"`);
  return makeCard(r, s);
}

/** "Ah Kd 7c" → array di carte. */
export function parseCards(text: string): Card[] {
  return text.trim().split(/\s+/).filter(Boolean).map(parseCard);
}

/** Carta → "Ah" (notazione compatta, usata in test, log e file dati). */
export function cardToString(card: Card): string {
  return RANKS[rankOf(card)]! + SUITS[suitOf(card)]!;
}

export function cardsToString(cards: readonly Card[]): string {
  return cards.map(cardToString).join(" ");
}

/** Carta → "A♥" per la UI. */
export function cardToPretty(card: Card): string {
  const r = RANKS[rankOf(card)]!;
  return (r === "T" ? "10" : r) + SUIT_SYMBOLS[suitOf(card)]!;
}

/** Mazzo francese completo da 52 carte, in ordine. */
export function fullDeck(): Card[] {
  const deck: Card[] = [];
  for (let c = 0; c < 52; c++) deck.push(c);
  return deck;
}

/** Le due carte iniziali in notazione 169 ("AKs", "QJo", "77"). */
export function holeCardsLabel(a: Card, b: Card): string {
  const ra = rankOf(a), rb = rankOf(b);
  const hi = Math.max(ra, rb), lo = Math.min(ra, rb);
  if (hi === lo) return RANKS[hi]! + RANKS[lo]!;
  return RANKS[hi]! + RANKS[lo]! + (suitOf(a) === suitOf(b) ? "s" : "o");
}
