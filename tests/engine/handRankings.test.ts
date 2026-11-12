/** La classifica mostrata nell'app deve essere coerente con l'evaluator. */
import { describe, expect, it } from "vitest";
import { parseCards } from "../../src/engine/cards/card";
import { evaluate } from "../../src/engine/cards/evaluator";
import { currentHand, HAND_RANKINGS, rankingIdOf } from "../../src/engine/cards/handRankings";

describe("classifica dei punti", () => {
  it("ogni esempio, valutato, appartiene alla categoria dichiarata", () => {
    for (const e of HAND_RANKINGS) expect(rankingIdOf(evaluate(parseCards(e.example))), e.name).toBe(e.id);
  });

  it("gli esempi sono in ordine strettamente decrescente di forza", () => {
    const scores = HAND_RANKINGS.map((e) => evaluate(parseCards(e.example)));
    for (let i = 1; i < scores.length; i++) expect(scores[i - 1]!).toBeGreaterThan(scores[i]!);
  });

  it("ci sono tutte e 10 le categorie, una volta sola", () => {
    expect(new Set(HAND_RANKINGS.map((e) => e.id)).size).toBe(10);
  });
});

describe("punto attuale", () => {
  it("preflop: coppia servita e carta alta", () => {
    expect(currentHand(parseCards("8d 8h"))).toEqual({ id: 1, label: "Coppia di 8" });
    expect(currentHand(parseCards("Kd 7h"))).toEqual({ id: 0, label: "Carta alta K" });
  });
  it("dal flop usa l'evaluator", () => {
    expect(currentHand(parseCards("8d 8h 8s Kc 2d"))!.id).toBe(3);
    expect(currentHand(parseCards("Ah Kh Qh Jh Th 2c 3d"))!.id).toBe(9);
    expect(currentHand(parseCards("Ah 2d 3c 4s 5h"))!.id).toBe(4);
  });
  it("nessuna carta → null", () => {
    expect(currentHand([])).toBeNull();
  });
});
