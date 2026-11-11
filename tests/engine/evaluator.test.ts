/**
 * Test dell'hand evaluator.
 *
 * 1. Oracolo enumerativo: tutte le C(52,5) = 2 598 960 mani da 5 carte, contate per categoria.
 *    I valori attesi sono i conteggi combinatori classici (es. 4 royal flush, 36 altre straight flush, 624 poker...).
 * 2. Confronti puntuali fra mani note (kicker, split, ruota, due tris, ecc.).
 * 3. Coerenza 7 carte: il risultato con 7 carte è il massimo fra le 21 combinazioni di 5.
 */
import { describe, expect, it } from "vitest";
import { evaluate, categoryOf, HAND_CATEGORY, describeHand, kickersOf } from "../../src/engine/cards/evaluator";
import { parseCards, RANK_ACE } from "../../src/engine/cards/card";
import { createRng } from "../../src/engine/cards/rng";
import { shuffle } from "../../src/engine/cards/deck";

const ev = (s: string) => evaluate(parseCards(s));

describe("evaluator: oracolo sulle 2 598 960 mani da 5 carte", () => {
  it("conta le categorie come la combinatoria classica", () => {
    const counts = new Array<number>(9).fill(0);
    let royal = 0;
    const hand = [0, 0, 0, 0, 0];
    for (let a = 0; a < 48; a++) {
      hand[0] = a;
      for (let b = a + 1; b < 49; b++) {
        hand[1] = b;
        for (let c = b + 1; c < 50; c++) {
          hand[2] = c;
          for (let d = c + 1; d < 51; d++) {
            hand[3] = d;
            for (let e = d + 1; e < 52; e++) {
              hand[4] = e;
              const score = evaluate(hand);
              const cat = categoryOf(score);
              counts[cat]!++;
              if (cat === HAND_CATEGORY.STRAIGHT_FLUSH && kickersOf(score)[0] === RANK_ACE) royal++;
            }
          }
        }
      }
    }
    expect(counts.reduce((x, y) => x + y, 0)).toBe(2_598_960);
    expect(royal).toBe(4);
    expect(counts[HAND_CATEGORY.STRAIGHT_FLUSH]).toBe(40); // 4 royal + 36
    expect(counts[HAND_CATEGORY.FOUR_OF_A_KIND]).toBe(624);
    expect(counts[HAND_CATEGORY.FULL_HOUSE]).toBe(3_744);
    expect(counts[HAND_CATEGORY.FLUSH]).toBe(5_108);
    expect(counts[HAND_CATEGORY.STRAIGHT]).toBe(10_200);
    expect(counts[HAND_CATEGORY.THREE_OF_A_KIND]).toBe(54_912);
    expect(counts[HAND_CATEGORY.TWO_PAIR]).toBe(123_552);
    expect(counts[HAND_CATEGORY.PAIR]).toBe(1_098_240);
    expect(counts[HAND_CATEGORY.HIGH_CARD]).toBe(1_302_540);
  });

  it("produce esattamente 7 462 valori distinti (classi di equivalenza note)", () => {
    const distinct = new Set<number>();
    const hand = [0, 0, 0, 0, 0];
    for (let a = 0; a < 48; a++) {
      hand[0] = a;
      for (let b = a + 1; b < 49; b++) {
        hand[1] = b;
        for (let c = b + 1; c < 50; c++) {
          hand[2] = c;
          for (let d = c + 1; d < 51; d++) {
            hand[3] = d;
            for (let e = d + 1; e < 52; e++) {
              hand[4] = e;
              distinct.add(evaluate(hand));
            }
          }
        }
      }
    }
    expect(distinct.size).toBe(7_462);
  });
});

describe("evaluator: confronti puntuali", () => {
  it("ordina le categorie", () => {
    const order = [
      "2c 5d 9h Jc Ks", // carta alta
      "2c 2d 9h Jc Ks", // coppia
      "2c 2d 9h 9c Ks", // doppia coppia
      "2c 2d 2h Jc Ks", // tris
      "3c 4d 5h 6c 7s", // scala
      "2c 5c 9c Jc Kc", // colore
      "2c 2d 2h Jc Js", // full
      "2c 2d 2h 2s Ks", // poker
      "3c 4c 5c 6c 7c", // scala colore
    ].map(ev);
    for (let i = 1; i < order.length; i++) expect(order[i]!).toBeGreaterThan(order[i - 1]!);
  });

  it("usa i kicker", () => {
    expect(ev("Ac Ad 9h Jc Ks")).toBeGreaterThan(ev("Ah As 9d Jd Qs"));
    expect(ev("Ac Ad 9h Jc Ks")).toBe(ev("Ah As 9d Jd Kd")); // stessa mano, semi diversi: split
    expect(ev("Kc Kd Kh 2c 2s")).toBeGreaterThan(ev("Qc Qd Qh Ac As")); // tris decide il full
  });

  it("riconosce la ruota (A-2-3-4-5) come scala al 5, sotto la scala al 6", () => {
    const wheel = ev("Ac 2d 3h 4c 5s");
    expect(categoryOf(wheel)).toBe(HAND_CATEGORY.STRAIGHT);
    expect(kickersOf(wheel)[0]).toBe(3); // rank del 5
    expect(ev("2c 3d 4h 5c 6s")).toBeGreaterThan(wheel);
    expect(ev("Tc Jd Qh Kc As")).toBeGreaterThan(ev("9c Td Jh Qc Ks"));
  });

  it("non fa 'girare l'angolo' alla scala (Q-K-A-2-3 non è scala)", () => {
    expect(categoryOf(ev("Qc Kd Ah 2c 3s"))).toBe(HAND_CATEGORY.HIGH_CARD);
  });

  it("con 7 carte: due tris → full con il tris più alto e la coppia più alta", () => {
    const s = ev("Kc Kd Kh 7c 7d 7h 2s");
    expect(categoryOf(s)).toBe(HAND_CATEGORY.FULL_HOUSE);
    expect(kickersOf(s)).toEqual([11, 5]);
  });

  it("con 7 carte: tre coppie → doppia coppia con le due più alte e il kicker migliore", () => {
    const s = ev("Ac Ad 9h 9c 5s 5d Kh");
    expect(categoryOf(s)).toBe(HAND_CATEGORY.TWO_PAIR);
    expect(kickersOf(s)).toEqual([12, 7, 11]);
  });

  it("con 7 carte: colore con 6 carte dello stesso seme prende le 5 più alte", () => {
    const s = ev("2h 5h 9h Jh Kh Ah 3c");
    expect(categoryOf(s)).toBe(HAND_CATEGORY.FLUSH);
    expect(kickersOf(s)).toEqual([12, 11, 9, 7, 3]);
  });

  it("con 7 carte: la scala colore batte il colore anche se il colore ha carte più alte", () => {
    const s = ev("3h 4h 5h 6h 7h Ah Kh");
    expect(categoryOf(s)).toBe(HAND_CATEGORY.STRAIGHT_FLUSH);
    expect(kickersOf(s)[0]).toBe(5); // 7 alto
  });

  it("descrive la mano in italiano", () => {
    expect(describeHand(ev("Tc Jc Qc Kc Ac"))).toBe("Scala reale");
    expect(describeHand(ev("Kc Kd Kh 7c 7d"))).toBe("Full house, K pieni di 7");
    expect(describeHand(ev("Ac 2d 3h 4c 5s"))).toBe("Scala al 5");
  });
});

describe("evaluator: coerenza 7 carte vs massimo delle 21 combinazioni", () => {
  it("coincide su 20 000 mani casuali", () => {
    const rng = createRng(42);
    const deck = Array.from({ length: 52 }, (_, i) => i);
    for (let t = 0; t < 20_000; t++) {
      shuffle(deck, rng);
      const seven = deck.slice(0, 7);
      let best = 0;
      for (let a = 0; a < 3; a++)
        for (let b = a + 1; b < 4; b++)
          for (let c = b + 1; c < 5; c++)
            for (let d = c + 1; d < 6; d++)
              for (let e = d + 1; e < 7; e++)
                best = Math.max(best, evaluate([seven[a]!, seven[b]!, seven[c]!, seven[d]!, seven[e]!]));
      expect(evaluate(seven)).toBe(best);
    }
  });
});
