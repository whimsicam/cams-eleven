/**
 * Test statistici dell'equity. I valori di riferimento sono calcolati per enumerazione esatta
 * (equityExact) o sono casi degeneri; il Monte Carlo deve cadere entro 4 errori standard.
 */
import { describe, expect, it } from "vitest";
import { parseCards } from "../../src/engine/cards/card";
import { createRng } from "../../src/engine/cards/rng";
import { breakEvenEquity, equityExact, equityMonteCarlo } from "../../src/strategy/equity";

describe("equityExact", () => {
  it("river: la mano migliore ha equity 1", () => {
    const r = equityExact(parseCards("Ah Ad"), parseCards("As 2c 7d 9h Kc"), [parseCards("Kh Kd")]);
    expect(r.equity).toBe(1);
    expect(r.samples).toBe(1);
  });

  it("turn: flush draw a 9 outs su 44 carte → 9/44", () => {
    // Hero: colore di cuori in progetto; villain ha tris di 7 che vince se non esce un cuore...
    // ma attenzione: il villain può fare full. Usiamo un caso pulito: villain ha coppia bassa senza out.
    const hero = parseCards("Ah Kh");
    const board = parseCards("2h 7h 9c 3s");
    const villain = parseCards("9d 8d"); // coppia di 9 (nessun full possibile che batta il colore senza doppiare il board)
    const r = equityExact(hero, board, [villain]);
    // Outs dell'hero: 9 cuori + 3 assi + 3 re = 15 su 44. Il villain non migliora oltre il colore se non con 9 o 8 (tris/doppia coppia non battono il colore).
    // Ma se esce un 9 o un 8 NON di cuori e l'hero non chiude, il villain vince comunque come ora. Quindi equity = 15/44.
    expect(r.samples).toBe(44);
    expect(r.equity).toBeCloseTo(15 / 44, 10);
  });
});

describe("equityMonteCarlo", () => {
  it("coincide con l'enumerazione esatta sul turn entro 4 errori standard", () => {
    const hero = parseCards("Ah Kh");
    const board = parseCards("2h 7h 9c 3s");
    const villain = parseCards("9d 8d");
    const exact = equityExact(hero, board, [villain]).equity;
    const mc = equityMonteCarlo({ hero, board, opponents: [villain], samples: 20_000, rng: createRng(1) });
    expect(Math.abs(mc.equity - exact)).toBeLessThan(4 * mc.stderr + 1e-9);
  });

  it("AA contro un avversario casuale: circa 85 % (valore classico ≈ 85,2 %)", () => {
    const mc = equityMonteCarlo({ hero: parseCards("Ah As"), opponents: 1, samples: 40_000, rng: createRng(2) });
    expect(mc.equity).toBeGreaterThan(0.84);
    expect(mc.equity).toBeLessThan(0.865);
  });

  it("mani identiche per valore (AKo vs AKo, semi diversi) hanno equity ≈ 50 %", () => {
    const mc = equityMonteCarlo({ hero: parseCards("Ah Kd"), opponents: [parseCards("Ac Ks")], samples: 20_000, rng: createRng(3) });
    expect(Math.abs(mc.equity - 0.5)).toBeLessThan(4 * mc.stderr + 1e-9);
  });

  it("72o contro 5 avversari casuali ha equity bassa (< 12 %)", () => {
    const mc = equityMonteCarlo({ hero: parseCards("7h 2d"), opponents: 5, samples: 20_000, rng: createRng(4) });
    expect(mc.equity).toBeLessThan(0.12);
  });
});

describe("breakEvenEquity", () => {
  it("chiamare 10 in un piatto di 30 richiede il 25 %", () => {
    expect(breakEvenEquity(10, 30)).toBe(0.25);
  });
  it("check costa 0", () => {
    expect(breakEvenEquity(0, 30)).toBe(0);
  });
});
