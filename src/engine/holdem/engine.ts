/**
 * Engine Texas Hold'em No-Limit: macchina a stati pura.
 *
 *   startHand(...)            → stato iniziale con blind e carte distribuite
 *   legalActions(state)       → cosa può fare chi deve agire
 *   applyAction(state, a)     → nuovo stato (avanza street, gestisce all-in, chiude la mano)
 *
 * Regole implementate:
 * - Blind piccolo e grande; heads-up il button è small blind e agisce per primo preflop.
 * - Min-raise = dimensione dell'ultimo rilancio completo (inizialmente il big blind).
 * - Un all-in inferiore a un rilancio completo NON riapre l'azione per chi ha già agito.
 * - Side pot per ogni livello di investimento; odd chip al primo seat idoneo a sinistra del button.
 * - Se resta un solo giocatore non foldato, vince senza showdown.
 * - Se tutti i giocatori rimasti sono all-in (o al massimo uno può ancora agire), si completa il board.
 */
import { type Card } from "../cards/card";
import { Deck } from "../cards/deck";
import { createRng } from "../cards/rng";
import { describeHand, evaluate } from "../cards/evaluator";
import type { Action, HandEvent, HandResult, HandState, HoldemConfig, LegalActions, Pot, SeatState, Street } from "./types";

export interface SeatSetup {
  seat: number;
  name: string;
  stack: number;
}

/** Piatto totale (chip già investite da tutti). */
export function potSize(state: HandState): number {
  return state.seats.reduce((sum, s) => sum + s.invested, 0);
}

/** Giocatori non foldati. */
export function livePlayers(state: HandState): SeatState[] {
  return state.seats.filter((s) => !s.folded);
}

/** Giocatori che possono ancora agire (non foldati, non all-in). */
function actors(seats: readonly SeatState[]): SeatState[] {
  return seats.filter((s) => !s.folded && !s.allIn);
}

/** Prossimo seat (in senso orario) che soddisfa il predicato, partendo DOPO `from`. */
function nextSeat(seats: readonly SeatState[], from: number, pred: (s: SeatState) => boolean): number {
  const n = seats.length;
  for (let k = 1; k <= n; k++) {
    const s = seats[(from + k) % n]!;
    if (pred(s)) return s.seat;
  }
  return -1;
}

function withSeat(state: HandState, seat: number, patch: Partial<SeatState>): SeatState[] {
  return state.seats.map((s) => (s.seat === seat ? { ...s, ...patch } : s));
}

/** Mette `amount` chip dal seat nel piatto (limitato dallo stack, segna all-in). */
function postChips(seats: SeatState[], seat: number, amount: number): SeatState[] {
  return seats.map((s) => {
    if (s.seat !== seat) return s;
    const put = Math.min(amount, s.stack);
    const stack = s.stack - put;
    return { ...s, stack, streetBet: s.streetBet + put, invested: s.invested + put, allIn: stack === 0 };
  });
}

/**
 * Inizia una nuova mano. `setups` sono i giocatori con stack > 0, in ordine di seat.
 * Il button è un indice in `setups`.
 */
export function startHand(setups: readonly SeatSetup[], button: number, config: HoldemConfig, seed: number, handId = 1): HandState {
  if (setups.length < 2) throw new Error("Servono almeno 2 giocatori");
  if (setups.some((s) => s.stack <= 0)) throw new Error("Ogni giocatore deve avere stack > 0");
  const rng = createRng(seed);
  const deck = new Deck(rng);

  let seats: SeatState[] = setups.map((p, i) => ({
    seat: i,
    name: p.name,
    stack: p.stack,
    holeCards: [],
    streetBet: 0,
    invested: 0,
    folded: false,
    allIn: false,
    needsAction: true,
    showed: false,
  }));

  const log: HandEvent[] = [{ type: "hand_start", handId, button, seed }];
  const n = seats.length;
  const headsUp = n === 2;
  // Heads-up: il button è small blind. Altrimenti SB è a sinistra del button.
  const sbSeat = headsUp ? button : (button + 1) % n;
  const bbSeat = (sbSeat + 1) % n;

  seats = postChips(seats, sbSeat, config.smallBlind);
  log.push({ type: "blind", seat: sbSeat, amount: Math.min(config.smallBlind, setups[sbSeat]!.stack), kind: "small" });
  seats = postChips(seats, bbSeat, config.bigBlind);
  log.push({ type: "blind", seat: bbSeat, amount: Math.min(config.bigBlind, setups[bbSeat]!.stack), kind: "big" });

  // Distribuzione: una carta a testa per due giri, partendo da sinistra del button.
  const hole: Card[][] = seats.map(() => []);
  for (let round = 0; round < 2; round++) {
    for (let k = 1; k <= n; k++) {
      const seat = (button + k) % n;
      hole[seat]!.push(deck.draw(1)[0]!);
    }
  }
  seats = seats.map((s) => ({ ...s, holeCards: hole[s.seat]! }));
  log.push({ type: "deal_hole" });

  // Preflop agisce per primo chi è a sinistra del big blind (heads-up: il button/SB).
  const firstToAct = nextSeat(seats, bbSeat, (s) => !s.folded && !s.allIn);

  const state: HandState = {
    handId,
    config,
    seed,
    button,
    seats,
    street: "preflop",
    board: [],
    deckRemaining: deck.peekRemaining(),
    currentBet: config.bigBlind,
    minRaise: config.bigBlind,
    actingSeat: firstToAct,
    lastAggressor: bbSeat,
    log,
  };

  // Caso limite: tutti all-in dai blind (stack minuscoli) → nessuno può agire.
  if (actors(seats).length <= 1 && allBetsMatched(state)) return runOutBoard(state);
  return state;
}

/** Vero se nessun giocatore attivo deve ancora pareggiare o agire. */
function allBetsMatched(state: HandState): boolean {
  return actors(state.seats).every((s) => !s.needsAction && s.streetBet === state.currentBet);
}

export function legalActions(state: HandState): LegalActions | null {
  if (state.actingSeat < 0 || state.street === "showdown" || state.street === "done") return null;
  const me = state.seats[state.actingSeat]!;
  const toCall = Math.max(0, state.currentBet - me.streetBet);
  const callAmount = Math.min(toCall, me.stack);
  const canCheck = toCall === 0;
  // Rilancio: totale minimo = currentBet + minRaise, massimo = all-in. Possibile solo se l'all-in supera il call.
  const maxTotal = me.streetBet + me.stack;
  let raise: LegalActions["raise"] = null;
  if (maxTotal > state.currentBet) {
    const minTotal = Math.min(state.currentBet + state.minRaise, maxTotal);
    raise = { min: minTotal, max: maxTotal, isBet: state.currentBet === 0 };
  }
  return {
    seat: me.seat,
    canFold: !canCheck,
    canCheck,
    callAmount,
    callIsAllIn: toCall > 0 && callAmount === me.stack && callAmount < toCall,
    raise,
  };
}

/**
 * Applica un'azione del seat che deve agire. Lancia su azione illegale.
 * Normalizza: "bet" e "raise" sono equivalenti (importo totale nella street).
 */
export function applyAction(state: HandState, action: Action): HandState {
  const legal = legalActions(state);
  if (!legal) throw new Error("Nessuna azione attesa in questo stato");
  const seat = legal.seat;
  const me = state.seats[seat]!;
  const potBefore = potSize(state);
  let seats = [...state.seats];
  let currentBet = state.currentBet;
  let minRaise = state.minRaise;
  let lastAggressor = state.lastAggressor;
  let normalized: Action = action;

  switch (action.type) {
    case "fold": {
      if (!legal.canFold) throw new Error("Fold non consentito: puoi fare check");
      seats = withSeat(state, seat, { folded: true, needsAction: false });
      break;
    }
    case "check": {
      if (!legal.canCheck) throw new Error("Check non consentito: c'è una puntata da chiamare");
      seats = withSeat(state, seat, { needsAction: false });
      break;
    }
    case "call": {
      if (legal.canCheck) throw new Error("Call non consentito: nessuna puntata da chiamare");
      seats = postChips(seats, seat, legal.callAmount);
      seats = seats.map((s) => (s.seat === seat ? { ...s, needsAction: false } : s));
      break;
    }
    case "bet":
    case "raise": {
      if (!legal.raise) throw new Error("Rilancio non consentito");
      const total = action.amount ?? legal.raise.min;
      if (!Number.isInteger(total)) throw new Error("L'importo deve essere intero");
      if (total < legal.raise.min && total !== legal.raise.max) throw new Error(`Rilancio minimo ${legal.raise.min}`);
      if (total > legal.raise.max) throw new Error(`Rilancio massimo ${legal.raise.max} (all-in)`);
      normalized = { type: legal.raise.isBet ? "bet" : "raise", amount: total };
      const raiseSize = total - currentBet;
      const fullRaise = raiseSize >= minRaise;
      seats = postChips(seats, seat, total - me.streetBet);
      seats = seats.map((s) => {
        if (s.seat === seat) return { ...s, needsAction: false };
        // Un rilancio completo riapre l'azione a tutti; uno incompleto (all-in corto) solo a chi non ha ancora agito.
        if (fullRaise && !s.folded && !s.allIn) return { ...s, needsAction: true };
        return s;
      });
      if (fullRaise) {
        minRaise = raiseSize;
        lastAggressor = seat;
      }
      currentBet = total;
      break;
    }
  }

  const log: HandEvent[] = [...state.log, { type: "action", seat, action: normalized, street: state.street, toCall: legal.callAmount, potBefore }];
  let next: HandState = { ...state, seats, currentBet, minRaise, lastAggressor, log, actingSeat: -1 };

  // Un solo giocatore rimasto: vince senza showdown.
  if (livePlayers(next).length === 1) return finishUncontested(next);

  // La street continua se qualcuno deve ancora agire.
  const pending = nextSeat(next.seats, seat, (s) => !s.folded && !s.allIn && (s.needsAction || s.streetBet < next.currentBet));
  if (pending >= 0 && !allBetsMatched(next)) return { ...next, actingSeat: pending };

  // Street conclusa.
  return advanceStreet(next);
}

const NEXT_STREET: Record<Street, Street> = {
  preflop: "flop",
  flop: "turn",
  turn: "river",
  river: "showdown",
  showdown: "done",
  done: "done",
};

/** Chiude la street corrente, distribuisce le carte della successiva o va allo showdown. */
function advanceStreet(state: HandState): HandState {
  const street = NEXT_STREET[state.street];
  if (street === "showdown") return showdown(state);

  const deck = [...state.deckRemaining];
  deck.shift(); // burn
  const dealt = street === "flop" ? deck.splice(0, 3) : deck.splice(0, 1);
  const board = [...state.board, ...dealt];
  const seats = state.seats.map((s) => ({ ...s, streetBet: 0, needsAction: !s.folded && !s.allIn }));
  const log: HandEvent[] = [...state.log, { type: "street", street, board }];
  const next: HandState = {
    ...state,
    seats,
    street,
    board,
    deckRemaining: deck,
    currentBet: 0,
    minRaise: state.config.bigBlind,
    lastAggressor: -1,
    log,
    actingSeat: -1,
  };
  // Se al massimo un giocatore può ancora agire, non c'è più azione: si completa il board.
  if (actors(seats).length <= 1) return advanceStreet(next);
  // Postflop agisce per primo chi è a sinistra del button.
  return { ...next, actingSeat: nextSeat(seats, state.button, (s) => !s.folded && !s.allIn) };
}

/** Completa il board senza azione (tutti all-in). */
function runOutBoard(state: HandState): HandState {
  let s: HandState = { ...state, actingSeat: -1 };
  while (s.street !== "done") s = advanceStreet(s);
  return s;
}

/** Calcola i piatti (main + side) dai livelli di investimento. */
export function computePots(seats: readonly SeatState[]): Pot[] {
  const levels = [...new Set(seats.filter((s) => s.invested > 0).map((s) => s.invested))].sort((a, b) => a - b);
  const pots: Pot[] = [];
  let prev = 0;
  for (const level of levels) {
    let amount = 0;
    for (const s of seats) amount += Math.max(0, Math.min(s.invested, level) - prev);
    const eligible = seats.filter((s) => !s.folded && s.invested >= level).map((s) => s.seat);
    if (amount > 0) {
      // Se gli idonei sono gli stessi del piatto precedente, si fondono (evita side pot inutili).
      const last = pots[pots.length - 1];
      if (last && last.eligible.length === eligible.length && last.eligible.every((e, i) => e === eligible[i])) {
        pots[pots.length - 1] = { amount: last.amount + amount, eligible };
      } else pots.push({ amount, eligible });
    }
    prev = level;
  }
  return pots;
}

function finishUncontested(state: HandState): HandState {
  const winner = livePlayers(state)[0]!;
  const pot = potSize(state);
  const seats = state.seats.map((s) => (s.seat === winner.seat ? { ...s, stack: s.stack + pot } : s));
  const results: HandResult[] = seats.map((s) => ({
    seat: s.seat,
    won: s.seat === winner.seat ? pot : 0,
    net: (s.seat === winner.seat ? pot : 0) - s.invested,
  }));
  const log: HandEvent[] = [...state.log, { type: "win", seat: winner.seat, amount: pot, potIndex: 0, reason: "uncontested" }, { type: "hand_end" }];
  return { ...state, seats, street: "done", actingSeat: -1, log, results };
}

function showdown(state: HandState): HandState {
  const live = livePlayers(state);
  const scores = new Map<number, number>();
  const log: HandEvent[] = [...state.log, { type: "street", street: "showdown", board: state.board }];
  for (const p of live) {
    const score = evaluate([...p.holeCards, ...state.board]);
    scores.set(p.seat, score);
    log.push({ type: "showdown", seat: p.seat, cards: p.holeCards, score, description: describeHand(score) });
  }

  const pots = computePots(state.seats);
  const won = new Map<number, number>();
  const n = state.seats.length;
  pots.forEach((pot, potIndex) => {
    let best = -1;
    for (const seat of pot.eligible) best = Math.max(best, scores.get(seat)!);
    const winners = pot.eligible.filter((seat) => scores.get(seat) === best);
    const share = Math.floor(pot.amount / winners.length);
    let odd = pot.amount - share * winners.length;
    // Odd chip: al primo vincitore a sinistra del button.
    const ordered = [...winners].sort((a, b) => ((a - state.button + n) % n) - ((b - state.button + n) % n));
    for (const seat of ordered) {
      let amount = share;
      if (odd > 0) {
        amount += 1;
        odd -= 1;
      }
      won.set(seat, (won.get(seat) ?? 0) + amount);
      log.push({ type: "win", seat, amount, potIndex, reason: "showdown" });
    }
  });

  const seats = state.seats.map((s) => ({ ...s, stack: s.stack + (won.get(s.seat) ?? 0), showed: !s.folded }));
  const results: HandResult[] = seats.map((s) => ({
    seat: s.seat,
    won: won.get(s.seat) ?? 0,
    net: (won.get(s.seat) ?? 0) - s.invested,
    score: scores.get(s.seat),
    description: scores.has(s.seat) ? describeHand(scores.get(s.seat)!) : undefined,
  }));
  log.push({ type: "hand_end" });
  return { ...state, seats, street: "done", actingSeat: -1, log, results };
}

/** Posizione a parole (per coach e lezioni): BTN, SB, BB, UTG, MP, CO... in base al numero di giocatori. */
export function positionName(seat: number, button: number, players: number): string {
  const offset = (seat - button + players) % players; // 0 = button
  if (players === 2) return offset === 0 ? "BTN/SB" : "BB";
  if (offset === 0) return "BTN";
  if (offset === 1) return "SB";
  if (offset === 2) return "BB";
  // Dal BB in poi: UTG ... CO. Con 6 giocatori: UTG (3), MP/HJ (4), CO (5).
  const fromBb = offset - 2; // 1 = UTG
  const beforeButton = players - 1 - offset; // 0 = CO
  if (beforeButton === 0) return "CO";
  if (beforeButton === 1) return "HJ";
  if (fromBb === 1) return "UTG";
  return `UTG+${fromBb - 1}`;
}
