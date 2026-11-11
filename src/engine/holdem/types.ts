/**
 * Tipi dell'engine Texas Hold'em No-Limit.
 *
 * Lo stato della mano è un oggetto immutabile: ogni azione produce un nuovo stato.
 * Questo rende semplici undo, replay, test e coach (che può rivalutare qualsiasi punto della mano).
 */
import type { Card } from "../cards/card";

export type Street = "preflop" | "flop" | "turn" | "river" | "showdown" | "done";

export type ActionType = "fold" | "check" | "call" | "bet" | "raise";

/** Azione richiesta da un giocatore. Per bet/raise `amount` è l'importo TOTALE della puntata nella street (raise "to"). */
export interface Action {
  type: ActionType;
  amount?: number;
}

export interface HoldemConfig {
  smallBlind: number;
  bigBlind: number;
  /** Stack iniziale, in chip. */
  startingStack: number;
}

export const DEFAULT_CONFIG: HoldemConfig = { smallBlind: 1, bigBlind: 2, startingStack: 200 };

export interface SeatState {
  seat: number;
  name: string;
  /** Chip dietro (non ancora nel piatto). */
  stack: number;
  holeCards: readonly Card[];
  /** Chip messe in questa street. */
  streetBet: number;
  /** Chip messe in tutta la mano (serve per i side pot). */
  invested: number;
  folded: boolean;
  allIn: boolean;
  /** Deve ancora agire in questa street (resettato da ogni raise completo). */
  needsAction: boolean;
  /** Ha mostrato le carte allo showdown (per la UI). */
  showed: boolean;
}

export type HandEvent =
  | { type: "hand_start"; handId: number; button: number; seed: number }
  | { type: "blind"; seat: number; amount: number; kind: "small" | "big" }
  | { type: "deal_hole" }
  | { type: "action"; seat: number; action: Action; street: Street; toCall: number; potBefore: number }
  | { type: "street"; street: Street; board: readonly Card[] }
  | { type: "showdown"; seat: number; cards: readonly Card[]; score: number; description: string }
  | { type: "win"; seat: number; amount: number; potIndex: number; reason: "showdown" | "uncontested" }
  | { type: "hand_end" };

export interface Pot {
  amount: number;
  /** Seat idonei a vincere questo piatto (non foldati e con invested ≥ livello). */
  eligible: readonly number[];
}

export interface HandState {
  handId: number;
  config: HoldemConfig;
  seed: number;
  button: number;
  seats: readonly SeatState[];
  street: Street;
  board: readonly Card[];
  /** Carte rimaste nel mazzo (dall'alto). Private: la UI non le mostra. */
  deckRemaining: readonly Card[];
  /** Puntata più alta della street corrente. */
  currentBet: number;
  /** Dimensione minima del prossimo rilancio (incremento, non totale). */
  minRaise: number;
  /** Seat che deve agire, o -1 se la street è conclusa. */
  actingSeat: number;
  /** Ultimo seat che ha fatto un raise completo nella street (per il coach e il bot). */
  lastAggressor: number;
  log: readonly HandEvent[];
  /** Risultati finali (presenti solo quando street === "done"). */
  results?: readonly HandResult[];
}

export interface HandResult {
  seat: number;
  /** Chip vinte (0 se non ha vinto nulla). */
  won: number;
  /** Variazione netta di stack nella mano. */
  net: number;
  score?: number;
  description?: string;
}

/** Azioni legali per il seat che deve agire. */
export interface LegalActions {
  seat: number;
  canFold: boolean;
  canCheck: boolean;
  /** Importo da aggiungere per chiamare (0 se può fare check). Limitato dallo stack. */
  callAmount: number;
  /** true se il call sarebbe un all-in parziale. */
  callIsAllIn: boolean;
  /** Se può puntare/rilanciare: importo totale minimo e massimo (all-in). null se non può. */
  raise: { min: number; max: number; isBet: boolean } | null;
}
