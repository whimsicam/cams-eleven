/**
 * Interfaccia comune dei bot Hold'em.
 *
 * Un bot è una funzione pura: riceve ciò che un giocatore vedrebbe al tavolo (BotView),
 * un RNG per le decisioni miste, e restituisce un'azione. Non vede le carte degli altri
 * né il mazzo: l'onestà del bot è garantita dalla struttura, non dalla disciplina.
 */
import type { Card } from "../engine/cards/card";
import type { Action, LegalActions, Street } from "../engine/holdem/types";
import type { Rng } from "../engine/cards/rng";

export type BotLevel = "easy" | "medium" | "hard" | "expert";

export const BOT_LEVEL_NAMES_IT: Record<BotLevel, string> = {
  easy: "Facile",
  medium: "Medio",
  hard: "Difficile",
  expert: "Avanzato",
};

export interface OpponentView {
  seat: number;
  name: string;
  stack: number;
  streetBet: number;
  invested: number;
  folded: boolean;
  allIn: boolean;
  /** Posizione a parole (BTN, SB, BB, UTG, HJ, CO). */
  position: string;
}

export interface BotView {
  seat: number;
  position: string;
  holeCards: readonly Card[];
  board: readonly Card[];
  street: Street;
  stack: number;
  /** Chip mie già nella street corrente. */
  streetBet: number;
  pot: number;
  /** Chip da aggiungere per chiamare. */
  toCall: number;
  bigBlind: number;
  legal: LegalActions;
  opponents: readonly OpponentView[];
  /** Avversari ancora in mano (non foldati). */
  playersInHand: number;
  /** Seat dell'ultimo rilancio completo nella street (-1 se nessuno). */
  lastAggressor: number;
  /** Numero di rilanci preflop finora (0 = nessuno, 1 = open raise, 2 = 3-bet...). */
  preflopRaises: number;
  /** Il bot è stato l'ultimo aggressore della street precedente (serve per la c-bet). */
  wasAggressor: boolean;
}

export interface Bot {
  level: BotLevel;
  decide(view: BotView, rng: Rng): Action;
}
