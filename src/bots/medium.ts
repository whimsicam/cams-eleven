/**
 * Bot Medio: tight-aggressive "da manuale".
 *
 * Preflop: range di apertura per posizione (top X % sull'ordinamento di data/holdem/preflop-equity.json),
 *   open raise a 2,5–3 big blind, 3-bet con le mani migliori, call con mani buone, fold il resto.
 * Postflop: equity Monte Carlo contro gli avversari in mano, confrontata con il break-even delle pot odds;
 *   punta 2/3 del piatto con mani forti, continuation bet se era l'aggressore preflop (in heads-up),
 *   semi-bluff occasionale con equity intermedia (progetti), fold quando le pot odds non reggono.
 *
 * Le percentuali dei range sono dichiarate qui e documentate in docs/; sono un punto di partenza
 * ragionevole (apertura stretta da UTG, larga dal button), non un range risolto.
 */
import { breakEvenEquity, equityMonteCarlo } from "../strategy/equity";
import { holeCardsTopPercent } from "../strategy/preflop";
import type { Rng } from "../engine/cards/rng";
import type { Action } from "../engine/holdem/types";
import type { Bot, BotView } from "./types";

/** Frazione di mani aperte per posizione (6-max). */
export const OPEN_RANGE: Record<string, number> = {
  UTG: 0.15,
  "UTG+1": 0.17,
  "UTG+2": 0.19,
  "UTG+3": 0.21,
  HJ: 0.2,
  CO: 0.27,
  BTN: 0.4,
  SB: 0.32,
  BB: 0.3, // usato solo quando il BB rilancia sopra i limper
  "BTN/SB": 0.6,
};
/** Mani con cui 3-bettare e con cui chiamare un open raise. */
export const THREE_BET_RANGE = 0.05;
export const CALL_RAISE_RANGE = 0.14;
export const CALL_THREE_BET_RANGE = 0.07;

function raiseTo(view: BotView, total: number): Action {
  const r = view.legal.raise!;
  const amount = Math.max(r.min, Math.min(r.max, Math.round(total)));
  return { type: r.isBet ? "bet" : "raise", amount };
}

export const mediumBot: Bot = {
  level: "medium",
  decide(view: BotView, rng: Rng): Action {
    const { legal, toCall, pot, bigBlind, stack } = view;

    if (view.street === "preflop") {
      const top = holeCardsTopPercent(view.holeCards[0]!, view.holeCards[1]!);
      const open = OPEN_RANGE[view.position] ?? 0.2;

      if (view.preflopRaises === 0) {
        // Nessun rilancio: apro con il mio range, altrimenti fold (o check dal BB).
        if (top <= open && legal.raise) {
          const limpers = view.opponents.filter((o) => !o.folded && o.streetBet >= bigBlind && o.position !== "BB").length;
          return raiseTo(view, (2.5 + 0.5 * limpers) * bigBlind);
        }
        if (toCall === 0) return { type: "check" };
        // Dal SB con mano discreta completo il blind.
        if (view.position === "SB" && top <= 0.45 && toCall <= bigBlind) return { type: "call" };
        return { type: "fold" };
      }

      if (view.preflopRaises === 1) {
        if (top <= THREE_BET_RANGE && legal.raise) return raiseTo(view, view.streetBet + toCall * 3);
        if (top <= CALL_RAISE_RANGE && toCall <= stack * 0.25) return { type: "call" };
        return { type: "fold" };
      }

      // Già 3-bettato o più: solo le premium continuano; AA/KK spingono.
      if (top <= 0.02 && legal.raise) return raiseTo(view, legal.raise.max);
      if (top <= CALL_THREE_BET_RANGE && toCall <= stack * 0.4) return { type: "call" };
      return { type: "fold" };
    }

    // Postflop
    const opponentsInHand = Math.max(1, view.playersInHand - 1);
    const eq = equityMonteCarlo({ hero: view.holeCards, board: view.board, opponents: opponentsInHand, samples: 600, rng }).equity;
    const strong = eq > 0.65;
    const medium = eq > 0.45;
    const drawish = view.street !== "river" && eq >= 0.28 && eq < 0.45;

    if (toCall === 0) {
      if (strong && legal.raise) return raiseTo(view, view.streetBet + pot * 0.66);
      // Continuation bet heads-up se ero l'aggressore preflop, anche senza nulla (60 % delle volte).
      if (view.wasAggressor && opponentsInHand === 1 && legal.raise && rng.next() < 0.6) return raiseTo(view, view.streetBet + pot * 0.5);
      if (drawish && legal.raise && rng.next() < 0.3) return raiseTo(view, view.streetBet + pot * 0.5); // semi-bluff
      return { type: "check" };
    }

    const breakEven = breakEvenEquity(toCall, pot);
    if (eq > 0.8 && legal.raise) return raiseTo(view, view.streetBet + toCall + pot * 0.75);
    if (strong) return { type: "call" };
    if (medium && eq > breakEven + 0.05) return { type: "call" };
    // Progetti: chiamo se le pot odds reggono (con un po' di implied odds sul flop).
    const implied = view.street === "flop" ? 0.06 : 0;
    if (drawish && eq + implied > breakEven) return { type: "call" };
    return { type: "fold" };
  },
};
