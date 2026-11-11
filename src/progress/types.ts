/**
 * Modello dei progressi (SPEC.md §9.1). Schema versionato: `schema` cresce a ogni cambiamento
 * incompatibile e `migrate()` in local.ts porta i dati vecchi al formato nuovo.
 */
import type { Action } from "../engine/holdem/types";

export const SCHEMA_VERSION = 1;

export type GameId = "holdem" | "blackjack" | "draw";

export interface HandRecord {
  /** `${deviceId}-${timestamp}-${n}`: unico tra dispositivi. */
  id: string;
  game: GameId;
  /** Timestamp ISO di fine mano. */
  ts: string;
  mode: "play" | "train";
  level: string;
  /** Variazione di stack dell'utente nella mano. */
  net: number;
  bigBlind: number;
  /** Descrizione della mano dell'utente allo showdown, se c'è stato. */
  showdown?: string;
  /** Replay compatto: basta rigiocare le azioni sull'engine per ricostruire tutto. */
  replay: {
    seed: number;
    button: number;
    stacks: number[];
    names: string[];
    humanSeat: number;
    actions: Action[];
  };
  /** Decisioni valutate dal coach (Fase 2). */
  decisions: DecisionRecord[];
}

export interface DecisionRecord {
  street: string;
  action: Action;
  verdict: "ok" | "minor" | "mistake";
  evLoss?: number;
  note?: string;
}

export interface DrillRecord {
  id: string;
  drill: string;
  item: string;
  correct: boolean;
  ms: number;
  ts: string;
}

export interface LessonProgress {
  status: "new" | "started" | "done";
  completedAt?: string;
}

export interface SrsItem {
  ease: number;
  interval: number;
  due: string;
  lastReview: string;
}

export interface Settings {
  /** Velocità dei bot: 1 = normale (~1 s), 0 = veloce. */
  botDelay: number;
  animations: boolean;
  defaultLevel: "easy" | "medium" | "hard" | "expert";
  playerName: string;
}

export const DEFAULT_SETTINGS: Settings = {
  botDelay: 1,
  animations: true,
  defaultLevel: "easy",
  playerName: "CAM",
};

/** Snapshot completo di un dispositivo: è ciò che viene scritto in progress/<deviceId>.json. */
export interface ProgressData {
  schema: number;
  deviceId: string;
  updatedAt: string;
  hands: HandRecord[];
  drills: DrillRecord[];
  lessons: Record<string, LessonProgress>;
  srs: Record<string, SrsItem>;
  bankroll: Record<GameId, number>;
  settings: Settings;
}

export function emptyProgress(deviceId: string): ProgressData {
  return {
    schema: SCHEMA_VERSION,
    deviceId,
    updatedAt: new Date(0).toISOString(),
    hands: [],
    drills: [],
    lessons: {},
    srs: {},
    bankroll: { holdem: 0, blackjack: 0, draw: 0 },
    settings: { ...DEFAULT_SETTINGS },
  };
}
