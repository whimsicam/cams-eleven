/**
 * Fuzz test dell'engine: migliaia di mani con azioni legali casuali.
 * Invarianti: la mano termina sempre, le chip si conservano, nessuno va sotto zero,
 * le vincite totali coincidono con il piatto, chi ha foldato non vince.
 */
import { describe, expect, it } from "vitest";
import { applyAction, legalActions, potSize, startHand } from "../../src/engine/holdem/engine";
import { createRng } from "../../src/engine/cards/rng";

describe("holdem fuzz", () => {
  it("3 000 mani casuali con 2–6 giocatori e stack irregolari", () => {
    const rng = createRng(777);
    for (let h = 0; h < 3000; h++) {
      const n = 2 + rng.int(5);
      const setups = Array.from({ length: n }, (_, i) => ({ seat: i, name: `P${i}`, stack: 1 + rng.int(300) }));
      const total = setups.reduce((a, s) => a + s.stack, 0);
      let s = startHand(setups, rng.int(n), { smallBlind: 1, bigBlind: 2, startingStack: 200 }, rng.int(1e9), h);
      let steps = 0;
      while (s.street !== "done") {
        const la = legalActions(s);
        expect(la, `mano ${h}: street ${s.street} senza azione né fine`).not.toBeNull();
        const r = rng.next();
        if (la!.canCheck && r < 0.5) s = applyAction(s, { type: "check" });
        else if (la!.raise && r < 0.75) {
          const amount = la!.raise.min + rng.int(la!.raise.max - la!.raise.min + 1);
          s = applyAction(s, { type: "raise", amount });
        } else if (!la!.canCheck && r < 0.9) s = applyAction(s, { type: "call" });
        else if (la!.canFold) s = applyAction(s, { type: "fold" });
        else s = applyAction(s, { type: la!.canCheck ? "check" : "call" });
        if (++steps > 500) throw new Error(`mano ${h}: non termina`);
      }
      const stacks = s.seats.reduce((a, p) => a + p.stack, 0);
      expect(stacks).toBe(total);
      expect(potSize(s)).toBe(s.results!.reduce((a, r) => a + r.won, 0));
      for (const p of s.seats) {
        expect(p.stack).toBeGreaterThanOrEqual(0);
        if (p.folded) expect(s.results!.find((r) => r.seat === p.seat)!.won).toBe(0);
      }
      expect(s.results!.reduce((a, r) => a + r.net, 0)).toBe(0);
    }
  });
});
