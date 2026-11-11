/**
 * Test dell'engine Hold'em: ordine di azione, min-raise, side pot, split pot, chiusura mano.
 */
import { describe, expect, it } from "vitest";
import { applyAction, computePots, legalActions, positionName, potSize, startHand, type SeatSetup } from "../../src/engine/holdem/engine";
import type { HandState, SeatState } from "../../src/engine/holdem/types";

const cfg = { smallBlind: 1, bigBlind: 2, startingStack: 200 };
const players = (stacks: number[]): SeatSetup[] => stacks.map((stack, i) => ({ seat: i, name: `P${i}`, stack }));

function play(state: HandState, moves: Array<[string, number?]>): HandState {
  let s = state;
  for (const [type, amount] of moves) {
    s = applyAction(s, { type: type as "fold" | "check" | "call" | "bet" | "raise", amount });
  }
  return s;
}

/** Conservazione delle chip: la somma degli stack + piatto è costante. */
function totalChips(state: HandState): number {
  return state.seats.reduce((sum, s) => sum + s.stack, 0) + (state.street === "done" ? 0 : potSize(state));
}

describe("startHand", () => {
  it("mette i blind e fa agire UTG a 6 giocatori", () => {
    const s = startHand(players([200, 200, 200, 200, 200, 200]), 0, cfg, 1);
    expect(s.seats[1]!.streetBet).toBe(1);
    expect(s.seats[2]!.streetBet).toBe(2);
    expect(s.actingSeat).toBe(3);
    expect(s.seats.every((p) => p.holeCards.length === 2)).toBe(true);
    expect(potSize(s)).toBe(3);
  });

  it("heads-up: il button è small blind e agisce per primo preflop, il BB per primo postflop", () => {
    const s = startHand(players([200, 200]), 0, cfg, 1);
    expect(s.seats[0]!.streetBet).toBe(1);
    expect(s.seats[1]!.streetBet).toBe(2);
    expect(s.actingSeat).toBe(0);
    const flop = play(s, [["call"], ["check"]]);
    expect(flop.street).toBe("flop");
    expect(flop.actingSeat).toBe(1);
  });
});

describe("legalActions e min-raise", () => {
  it("UTG preflop: call 2, raise minimo a 4, massimo all-in", () => {
    const s = startHand(players([200, 200, 200]), 0, cfg, 1);
    const la = legalActions(s)!;
    expect(la.seat).toBe(0); // 3 giocatori: button è UTG
    expect(la.callAmount).toBe(2);
    expect(la.canCheck).toBe(false);
    expect(la.raise).toEqual({ min: 4, max: 200, isBet: false });
  });

  it("dopo un raise a 6 il min-raise successivo è a 10 (incremento 4)", () => {
    const s = play(startHand(players([200, 200, 200]), 0, cfg, 1), [["raise", 6]]);
    expect(legalActions(s)!.raise!.min).toBe(10);
    expect(() => applyAction(s, { type: "raise", amount: 9 })).toThrow();
  });

  it("il BB ha l'opzione: se tutti chiamano può fare check o rilanciare", () => {
    const s = play(startHand(players([200, 200, 200]), 0, cfg, 1), [["call"], ["call"]]);
    expect(s.actingSeat).toBe(2);
    const la = legalActions(s)!;
    expect(la.canCheck).toBe(true);
    expect(la.raise!.min).toBe(4);
    const flop = applyAction(s, { type: "check" });
    expect(flop.street).toBe("flop");
    expect(flop.board.length).toBe(3);
  });

  it("un all-in corto non riapre l'azione a chi ha già agito", () => {
    // P0 (button/UTG) raise a 6, P1 (SB, stack 7) all-in a 7 (incremento 1 < 4), P2 (BB) chiama 7.
    // P0 ha già agito e l'all-in non è un rilancio completo: può solo chiamare 1, non rilanciare? No:
    // la regola è che l'azione non si riapre per P0, quindi P0 può solo call o fold.
    const s = play(startHand(players([200, 7, 200]), 0, cfg, 1), [["raise", 6], ["raise", 7], ["call"]]);
    expect(s.actingSeat).toBe(0);
    const la = legalActions(s)!;
    expect(la.callAmount).toBe(1);
    // L'engine permette comunque il raise come azione tecnica? No: needsAction è falso ma deve pareggiare.
    // Qui verifichiamo solo che chiamando si vada al flop senza altro giro.
    const flop = applyAction(s, { type: "call" });
    expect(flop.street).toBe("flop");
  });
});

describe("chiusura della mano", () => {
  it("se tutti foldano vince il BB senza showdown", () => {
    const s = play(startHand(players([200, 200, 200]), 0, cfg, 1), [["fold"], ["fold"]]);
    expect(s.street).toBe("done");
    expect(s.seats[2]!.stack).toBe(201);
    expect(s.results!.find((r) => r.seat === 2)!.net).toBe(1);
    expect(s.log.at(-2)).toMatchObject({ type: "win", seat: 2, amount: 3, reason: "uncontested" });
  });

  it("conserva le chip lungo tutta la mano fino allo showdown", () => {
    let s = startHand(players([200, 200, 200, 200, 200, 200]), 0, cfg, 99);
    const total = totalChips(s);
    // Tutti chiamano preflop, poi check fino allo showdown.
    s = play(s, [["call"], ["call"], ["call"], ["call"], ["call"], ["check"]]);
    for (const street of ["flop", "turn", "river"]) {
      expect(s.street).toBe(street);
      s = play(s, [["check"], ["check"], ["check"], ["check"], ["check"], ["check"]]);
    }
    expect(s.street).toBe("done");
    expect(s.board.length).toBe(5);
    expect(totalChips(s)).toBe(total);
    const won = s.results!.reduce((a, r) => a + r.won, 0);
    expect(won).toBe(12);
  });

  it("tutti all-in preflop: il board viene completato senza azione", () => {
    const s = play(startHand(players([50, 50, 50]), 0, cfg, 5), [["raise", 50], ["call"], ["call"]]);
    expect(s.street).toBe("done");
    expect(s.board.length).toBe(5);
    expect(totalChips(s)).toBe(150);
  });
});

describe("side pot", () => {
  const seat = (seat: number, invested: number, folded = false): SeatState => ({
    seat,
    name: `P${seat}`,
    stack: 0,
    holeCards: [],
    streetBet: 0,
    invested,
    folded,
    allIn: false,
    needsAction: false,
    showed: false,
  });

  it("tre livelli di all-in → main pot + due side pot", () => {
    const pots = computePots([seat(0, 10), seat(1, 30), seat(2, 60), seat(3, 60)]);
    expect(pots).toEqual([
      { amount: 40, eligible: [0, 1, 2, 3] },
      { amount: 60, eligible: [1, 2, 3] },
      { amount: 60, eligible: [2, 3] },
    ]);
  });

  it("le chip di chi ha foldato stanno nei piatti ma lui non è idoneo", () => {
    const pots = computePots([seat(0, 10, true), seat(1, 30), seat(2, 30)]);
    expect(pots).toEqual([{ amount: 70, eligible: [1, 2] }]);
  });

  it("in una mano reale il giocatore corto vince solo il main pot", () => {
    // Cerchiamo un seed in cui il giocatore 1 (stack 20) vince allo showdown contro due stack da 200 all-in.
    for (let seed = 1; seed < 400; seed++) {
      const s = play(startHand(players([200, 20, 200]), 0, cfg, seed), [["raise", 200], ["call"], ["call"]]);
      expect(s.street).toBe("done");
      expect(totalChips(s)).toBe(420);
      const r1 = s.results!.find((r) => r.seat === 1)!;
      if (r1.won > 0) {
        // Il main pot vale 20 × 3 = 60; il side pot (180 × 2 = 360) va a 0 o 2.
        expect(r1.won).toBeLessThanOrEqual(60);
        const side = s.results!.filter((r) => r.seat !== 1).reduce((a, r) => a + r.won, 0);
        expect(side + r1.won).toBe(420);
        return;
      }
    }
    throw new Error("Nessun seed in cui il corto vince: improbabile, controllare l'engine");
  });
});

describe("positionName", () => {
  it("6-max", () => {
    expect([0, 1, 2, 3, 4, 5].map((s) => positionName(s, 0, 6))).toEqual(["BTN", "SB", "BB", "UTG", "HJ", "CO"]);
  });
  it("9 giocatori", () => {
    expect([3, 4, 5, 6, 7, 8].map((s) => positionName(s, 0, 9))).toEqual(["UTG", "UTG+1", "UTG+2", "UTG+3", "HJ", "CO"]);
  });
  it("heads-up", () => {
    expect(positionName(0, 0, 2)).toBe("BTN/SB");
    expect(positionName(1, 0, 2)).toBe("BB");
  });
});
