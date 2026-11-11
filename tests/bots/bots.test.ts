/**
 * Test dei bot e della tabella preflop.
 * - La tabella generata deve riprodurre i valori classici (AA ≈ 85 %, 72o ≈ 35 % heads-up).
 * - I bot producono sempre azioni legali (fuzz su molte mani).
 * - Gerarchia: il bot Medio batte il Facile su un campione lungo (test statistico con seed fisso).
 */
import { describe, expect, it } from "vitest";
import table from "../../data/holdem/preflop-equity.json";
import { handTopPercent, preflopEquity } from "../../src/strategy/preflop";
import { createSession, playBotHand } from "../../src/engine/holdem/table";
import { DEFAULT_CONFIG } from "../../src/engine/holdem/types";

describe("tabella preflop", () => {
  it("ha 169 mani e 1 326 combinazioni", () => {
    expect(table.hands.length).toBe(169);
    expect(table.hands.reduce((a, h) => a + h.combos, 0)).toBe(1326);
  });
  it("riproduce i valori classici heads-up entro 1 punto", () => {
    expect(preflopEquity("AA", 1)).toBeGreaterThan(0.845);
    expect(preflopEquity("AA", 1)).toBeLessThan(0.862);
    expect(preflopEquity("KK", 1)).toBeGreaterThan(0.815);
    expect(preflopEquity("AKs", 1)).toBeGreaterThan(0.66);
    expect(preflopEquity("72o", 1)).toBeLessThan(0.355);
    expect(preflopEquity("72o", 1)).toBeGreaterThan(0.335);
  });
  it("ordina AA in cima e 72o in fondo", () => {
    expect(handTopPercent("AA")).toBeCloseTo(6 / 1326, 3);
    expect(handTopPercent("72o")).toBeGreaterThan(0.95); // heads-up contro carte casuali 32o è ancora peggio
    expect(handTopPercent("AKs")).toBeLessThan(handTopPercent("AKo"));
  });
});

describe("bot: azioni sempre legali", () => {
  it("1 000 mani 6-max con bot misti", () => {
    const s = createSession(
      [
        { name: "A", bot: "easy" },
        { name: "B", bot: "medium" },
        { name: "C", bot: "easy" },
        { name: "D", bot: "medium" },
        { name: "E", bot: "easy" },
        { name: "F", bot: "medium" },
      ],
      DEFAULT_CONFIG,
      11,
    );
    for (let h = 0; h < 1000; h++) {
      const final = playBotHand(s);
      expect(final.street).toBe("done");
      // Ricarica chi è a zero, altrimenti il tavolo si svuota.
      for (const p of s.players) if (p.stack <= 0) p.stack = DEFAULT_CONFIG.startingStack;
    }
    const total = s.players.reduce((a, p) => a + p.net, 0);
    expect(total).toBe(0);
  });

  it("heads-up: 300 mani", () => {
    const s = createSession([{ name: "A", bot: "medium" }, { name: "B", bot: "easy" }], DEFAULT_CONFIG, 12);
    for (let h = 0; h < 300; h++) {
      playBotHand(s);
      for (const p of s.players) if (p.stack <= 0) p.stack = DEFAULT_CONFIG.startingStack;
    }
  });
});

describe("bot: gerarchia", () => {
  it("il Medio vince sul Facile (3 Medio vs 3 Facile, 2 000 mani)", () => {
    const s = createSession(
      [
        { name: "M1", bot: "medium" },
        { name: "E1", bot: "easy" },
        { name: "M2", bot: "medium" },
        { name: "E2", bot: "easy" },
        { name: "M3", bot: "medium" },
        { name: "E3", bot: "easy" },
      ],
      DEFAULT_CONFIG,
      2026,
    );
    for (let h = 0; h < 2000; h++) {
      playBotHand(s);
      for (const p of s.players) if (p.stack <= 0) p.stack = DEFAULT_CONFIG.startingStack;
    }
    const net = (level: string) => s.players.filter((p) => p.bot === level).reduce((a, p) => a + p.net, 0);
    const bb100 = (net("medium") / 3 / 2000) * 100 / DEFAULT_CONFIG.bigBlind;
    // Il Medio deve vincere in modo netto: almeno 10 bb/100 per giocatore.
    expect(bb100).toBeGreaterThan(10);
  });
});
