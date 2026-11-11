/**
 * Costruisce la vista del tavolo per un bot a partire dallo stato completo,
 * nascondendo le carte degli altri e il mazzo.
 */
import { legalActions, positionName, potSize } from "../engine/holdem/engine";
import type { HandState } from "../engine/holdem/types";
import type { BotView } from "./types";

export function buildBotView(state: HandState, seat: number): BotView {
  const legal = legalActions(state);
  if (!legal || legal.seat !== seat) throw new Error(`Non è il turno del seat ${seat}`);
  const me = state.seats[seat]!;
  const n = state.seats.length;

  let preflopRaises = 0;
  let lastPrevStreetAggressor = -1;
  for (const ev of state.log) {
    if (ev.type === "action" && ev.street === "preflop" && ev.action.type === "raise") preflopRaises++;
  }
  // Ultimo aggressore della street precedente: l'ultimo bet/raise prima dell'ultimo evento "street".
  let lastStreetIdx = -1;
  state.log.forEach((ev, i) => {
    if (ev.type === "street" && ev.street === state.street) lastStreetIdx = i;
  });
  for (let i = lastStreetIdx - 1; i >= 0; i--) {
    const ev = state.log[i]!;
    if (ev.type === "action" && (ev.action.type === "bet" || ev.action.type === "raise")) {
      lastPrevStreetAggressor = ev.seat;
      break;
    }
    if (ev.type === "street") break;
  }
  // Preflop: il "precedente aggressore" per la c-bet sul flop è l'ultimo raiser preflop.
  if (state.street === "flop" && lastPrevStreetAggressor === -1) {
    for (let i = lastStreetIdx - 1; i >= 0; i--) {
      const ev = state.log[i]!;
      if (ev.type === "action" && ev.action.type === "raise") {
        lastPrevStreetAggressor = ev.seat;
        break;
      }
    }
  }

  return {
    seat,
    position: positionName(seat, state.button, n),
    holeCards: me.holeCards,
    board: state.board,
    street: state.street,
    stack: me.stack,
    streetBet: me.streetBet,
    pot: potSize(state),
    toCall: legal.callAmount,
    bigBlind: state.config.bigBlind,
    legal,
    opponents: state.seats
      .filter((s) => s.seat !== seat)
      .map((s) => ({
        seat: s.seat,
        name: s.name,
        stack: s.stack,
        streetBet: s.streetBet,
        invested: s.invested,
        folded: s.folded,
        allIn: s.allIn,
        position: positionName(s.seat, state.button, n),
      })),
    playersInHand: state.seats.filter((s) => !s.folded).length,
    lastAggressor: state.lastAggressor,
    preflopRaises,
    wasAggressor: lastPrevStreetAggressor === seat,
  };
}
