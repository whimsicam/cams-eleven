/**
 * Mazzo e mescolamento.
 *
 * Fisher–Yates con il nostro RNG seedable: ogni permutazione è equiprobabile
 * (verificato dal test chi-quadro in tests/engine/shuffle.test.ts).
 */
import { fullDeck, type Card } from "./card";
import { type Rng } from "./rng";

/** Mescola in place con Fisher–Yates. Ritorna lo stesso array per comodità. */
export function shuffle<T>(items: T[], rng: Rng): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return items;
}

/** Mazzo da cui si pesca dall'alto. Immutabile dall'esterno: `draw` restituisce le carte e avanza il cursore. */
export class Deck {
  private readonly cards: Card[];
  private cursor = 0;

  constructor(rng: Rng, base: Card[] = fullDeck()) {
    this.cards = shuffle([...base], rng);
  }

  /** Pesca n carte dall'alto. Lancia se il mazzo non basta. */
  draw(n = 1): Card[] {
    if (this.cursor + n > this.cards.length) throw new Error(`Mazzo esaurito: chieste ${n}, disponibili ${this.remaining}`);
    const out = this.cards.slice(this.cursor, this.cursor + n);
    this.cursor += n;
    return out;
  }

  /** Brucia una carta (Hold'em prima di flop, turn e river). */
  burn(): void {
    this.draw(1);
  }

  get remaining(): number {
    return this.cards.length - this.cursor;
  }

  /** Le carte non ancora pescate, in ordine: serve ai test e alle simulazioni esatte. */
  peekRemaining(): readonly Card[] {
    return this.cards.slice(this.cursor);
  }
}

/** Le carte del mazzo completo che non compaiono in `used`. */
export function remainingCards(used: readonly Card[]): Card[] {
  const taken = new Set(used);
  return fullDeck().filter((c) => !taken.has(c));
}
