/**
 * Sessione al tavolo: sequenza di mani con rotazione del button, ricariche e bot.
 *
 * Usata dalla UI (una mano alla volta, con pausa per l'utente) e dalle simulazioni
 * bot-contro-bot nei test e negli script.
 */
import { createRng, randomSeed, type Rng } from "../cards/rng";
import { applyAction, legalActions, startHand, type SeatSetup } from "./engine";
import type { Action, HandState, HoldemConfig } from "./types";
import { buildBotView, botFor, type BotLevel } from "../../bots";

export interface TablePlayer {
  seat: number;
  name: string;
  stack: number;
  /** null = utente umano. */
  bot: BotLevel | null;
  /** Statistiche di sessione. */
  handsPlayed: number;
  net: number;
  rebuys: number;
}

export interface TableSession {
  config: HoldemConfig;
  players: TablePlayer[];
  button: number;
  handCount: number;
  rng: Rng;
  /** Seed della sessione, per riprodurre le mani. */
  seed: number;
}

export function createSession(players: Array<Pick<TablePlayer, "name" | "bot">>, config: HoldemConfig, seed = randomSeed()): TableSession {
  return {
    config,
    players: players.map((p, seat) => ({ seat, name: p.name, stack: config.startingStack, bot: p.bot, handsPlayed: 0, net: 0, rebuys: 0 })),
    button: 0,
    handCount: 0,
    rng: createRng(seed),
    seed,
  };
}

/** Ricarica allo stack iniziale chi è a zero (i bot sempre; l'umano solo se `rebuyHuman`). */
export function applyRebuys(session: TableSession, rebuyHuman: boolean): void {
  for (const p of session.players) {
    if (p.stack <= 0 && (p.bot !== null || rebuyHuman)) {
      p.stack = session.config.startingStack;
      p.rebuys++;
    }
  }
}

/** Avvia la mano successiva. Lancia se meno di 2 giocatori hanno chip. */
export function nextHand(session: TableSession): HandState {
  const setups: SeatSetup[] = session.players.filter((p) => p.stack > 0).map((p) => ({ seat: p.seat, name: p.name, stack: p.stack }));
  if (setups.length < 2) throw new Error("Servono almeno 2 giocatori con chip");
  // Il button avanza al prossimo seat con chip.
  const seatsWithChips = setups.map((s) => s.seat);
  let btn = session.button;
  do btn = (btn + 1) % session.players.length;
  while (!seatsWithChips.includes(btn));
  session.button = btn;
  session.handCount++;
  // L'engine lavora su indici 0..k-1 dei partecipanti: rimappa il button.
  const buttonIdx = setups.findIndex((s) => s.seat === btn);
  const seed = session.rng.int(2 ** 31);
  return startHand(setups.map((s, i) => ({ ...s, seat: i })), buttonIdx, session.config, seed, session.handCount);
}

/** Mappa dall'indice nell'engine al seat del tavolo (quando qualcuno è fuori per mancanza di chip). */
export function engineIndexToSeat(session: TableSession): number[] {
  return session.players.filter((p) => p.stack > 0).map((p) => p.seat);
}

/** Applica i risultati della mano agli stack e alle statistiche dei giocatori. */
export function settleHand(session: TableSession, final: HandState, seatMap: number[]): void {
  if (final.street !== "done" || !final.results) throw new Error("La mano non è finita");
  for (const r of final.results) {
    const p = session.players[seatMap[r.seat]!]!;
    p.stack = final.seats[r.seat]!.stack;
    p.net += r.net;
    p.handsPlayed++;
  }
}

/** Decide l'azione del bot che deve agire. Lancia se tocca all'umano. */
export function botAction(session: TableSession, state: HandState, seatMap: number[]): Action {
  const legal = legalActions(state);
  if (!legal) throw new Error("Nessuna azione attesa");
  const player = session.players[seatMap[legal.seat]!]!;
  if (player.bot === null) throw new Error("Tocca all'umano");
  return botFor(player.bot).decide(buildBotView(state, legal.seat), session.rng);
}

/** Gioca una mano intera fra soli bot (simulazioni). */
export function playBotHand(session: TableSession): HandState {
  const seatMap = engineIndexToSeat(session);
  let state = nextHand(session);
  let guard = 0;
  while (state.street !== "done") {
    state = applyAction(state, botAction(session, state, seatMap));
    if (++guard > 1000) throw new Error("Mano senza fine");
  }
  settleHand(session, state, seatMap);
  return state;
}
