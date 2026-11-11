/**
 * Test dello shuffle e dell'RNG.
 *
 * Chi-quadro: su N mescolamenti di un mazzo da 8 carte, ogni carta deve finire in ogni
 * posizione circa N/8 volte. Con 7×7 = 49 gradi di libertà, la soglia al 99,9 % è circa 85,4;
 * il test è deterministico (seed fisso), quindi non è flaky.
 */
import { describe, expect, it } from "vitest";
import { createRng } from "../../src/engine/cards/rng";
import { Deck, shuffle } from "../../src/engine/cards/deck";

describe("rng", () => {
  it("è deterministico dato il seed", () => {
    const a = createRng(123), b = createRng(123);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });
  it("int(n) resta in [0, n)", () => {
    const r = createRng(7);
    for (let i = 0; i < 10_000; i++) {
      const x = r.int(6);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(6);
    }
  });
});

describe("shuffle", () => {
  it("è una permutazione", () => {
    const rng = createRng(1);
    const deck = new Deck(rng);
    const all = deck.draw(52).sort((a, b) => a - b);
    expect(all).toEqual(Array.from({ length: 52 }, (_, i) => i));
    expect(deck.remaining).toBe(0);
  });

  it("distribuisce uniformemente le posizioni (chi-quadro, 8 carte, 40 000 mescolate)", () => {
    const n = 8, trials = 40_000;
    const counts = Array.from({ length: n }, () => new Array<number>(n).fill(0));
    const rng = createRng(2026);
    const items = Array.from({ length: n }, (_, i) => i);
    for (let t = 0; t < trials; t++) {
      shuffle(items, rng);
      for (let pos = 0; pos < n; pos++) counts[items[pos]!]![pos]!++;
    }
    const expected = trials / n;
    let chi2 = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) chi2 += (counts[i]![j]! - expected) ** 2 / expected;
    // 49 gradi di libertà: soglia 99,9 % ≈ 85,35
    expect(chi2).toBeLessThan(85.35);
  });
});
