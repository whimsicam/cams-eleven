/**
 * Bot Facile: la "calling station".
 *
 * Profilo (volutamente sfruttabile, come un amico che gioca per la prima volta):
 * - preflop: limpa/chiama quasi tutto, folda solo le mani peggiori contro un rilancio, rilancia solo con le premium;
 * - postflop: non folda quasi mai se ha qualcosa, punta solo con mani forti, non bluffa mai;
 * - non ragiona sulle pot odds né sulla posizione.
 *
 * Le soglie sono in termini di equity Monte Carlo contro avversari casuali: non è
 * strategia ottimale, è un modello di avversario debole e coerente.
 */
import { equityMonteCarlo } from "../strategy/equity";
import { holeCardsTopPercent } from "../strategy/preflop";
import type { Rng } from "../engine/cards/rng";
import type { Action } from "../engine/holdem/types";
import type { Bot, BotView } from "./types";

function raiseTo(view: BotView, total: number): Action {
  const r = view.legal.raise!;
  const amount = Math.max(r.min, Math.min(r.max, Math.round(total)));
  return { type: r.isBet ? "bet" : "raise", amount };
}

export const easyBot: Bot = {
  level: "easy",
  decide(view: BotView, rng: Rng): Action {
    const { legal, toCall, pot, bigBlind } = view;

    if (view.street === "preflop") {
      const top = holeCardsTopPercent(view.holeCards[0]!, view.holeCards[1]!);
      const premium = top <= 0.05; // AA–TT, AK, AQs circa
      if (premium && legal.raise && rng.next() < 0.7) return raiseTo(view, Math.max(view.legal.raise!.min, toCall + view.streetBet + 3 * bigBlind));
      if (toCall === 0) return { type: "check" };
      // Chiama quasi tutto: folda solo il 25 % peggiore se il call costa più di 4 big blind.
      if (top > 0.75 && toCall > 4 * bigBlind) return { type: "fold" };
      if (toCall > view.stack * 0.5 && top > 0.3) return { type: "fold" };
      return { type: "call" };
    }

    // Postflop: equity rapida contro gli avversari ancora in mano.
    const eq = equityMonteCarlo({
      hero: view.holeCards,
      board: view.board,
      opponents: Math.max(1, view.playersInHand - 1),
      samples: 300,
      rng,
    }).equity;

    if (toCall === 0) {
      // Punta solo con mani forti, metà piatto.
      if (eq > 0.7 && legal.raise && rng.next() < 0.8) return raiseTo(view, view.streetBet + pot * 0.5);
      return { type: "check" };
    }
    // Di fronte a una puntata: la calling station chiama con quasi tutto.
    if (eq > 0.85 && legal.raise && rng.next() < 0.5) return raiseTo(view, view.streetBet + toCall * 2.5);
    if (eq < 0.12 && toCall > pot * 0.4) return { type: "fold" };
    if (eq < 0.25 && toCall > view.stack * 0.6) return { type: "fold" };
    return { type: "call" };
  },
};
