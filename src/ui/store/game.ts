/**
 * Store della partita (Zustand): tiene la sessione al tavolo, la mano corrente,
 * fa agire i bot con un ritardo "umano" e registra le mani nei progressi.
 *
 * L'utente è sempre al seat 0 del tavolo. I bot occupano gli altri 5 seat.
 */
import { create } from "zustand";
import { applyAction, legalActions } from "../../engine/holdem/engine";
import { applyRebuys, botAction, createSession, engineIndexToSeat, nextHand, settleHand, type TableSession } from "../../engine/holdem/table";
import { DEFAULT_CONFIG, type Action, type HandState } from "../../engine/holdem/types";
import type { BotLevel } from "../../bots";
import { addHand, deviceId } from "../../progress/local";
import { schedulePush } from "../../progress/sync";
import type { HandRecord } from "../../progress/types";

export type Phase = "idle" | "playing" | "hand_over";

interface GameState {
  session: TableSession | null;
  hand: HandState | null;
  /** Mappa indice engine → seat del tavolo per la mano corrente. */
  seatMap: number[];
  phase: Phase;
  level: BotLevel;
  /** Azioni della mano corrente (per il replay). */
  actions: Action[];
  /** Stack a inizio mano, nell'ordine degli indici engine (per il replay). */
  handStacks: number[];
  /** Moltiplicatore del ritardo dei bot (0 = istantaneo). */
  botDelay: number;
  playerName: string;
  /** Record della sessione per la UI. */
  sessionHands: number;
  sessionNet: number;
  startSession(level: BotLevel, playerName: string): void;
  endSession(): void;
  deal(): void;
  humanAction(action: Action): void;
  rebuyHuman(): void;
  setBotDelay(d: number): void;
}

const BOT_NAMES = ["Luca", "Giulia", "Marco", "Sara", "Andrea"];
const HUMAN_SEAT = 0;
let botTimer: ReturnType<typeof setTimeout> | null = null;

export const useGame = create<GameState>((set, get) => {
  /** Fa agire i bot finché tocca all'umano o la mano finisce. */
  const advance = () => {
    const { session, hand, seatMap } = get();
    if (!session || !hand) return;
    if (hand.street === "done") {
      finishHand();
      return;
    }
    const legal = legalActions(hand);
    if (!legal) return;
    const tableSeat = seatMap[legal.seat]!;
    if (tableSeat === HUMAN_SEAT) return; // attende l'utente
    const delay = get().botDelay * (600 + Math.random() * 700);
    botTimer = setTimeout(() => {
      botTimer = null;
      const cur = get();
      if (!cur.session || !cur.hand || cur.hand !== hand) return;
      const action = botAction(cur.session, cur.hand, cur.seatMap);
      const next = applyAction(cur.hand, action);
      set({ hand: next, actions: [...cur.actions, action] });
      advance();
    }, delay);
  };

  const finishHand = () => {
    const { session, hand, seatMap, actions, level } = get();
    if (!session || !hand || !hand.results) return;
    settleHand(session, hand, seatMap);
    const humanIdx = seatMap.indexOf(HUMAN_SEAT);
    const res = hand.results.find((r) => r.seat === humanIdx);
    const net = res?.net ?? 0;
    const record: HandRecord = {
      id: `${deviceId()}-${Date.now()}-${hand.handId}`,
      game: "holdem",
      ts: new Date().toISOString(),
      mode: "play",
      level,
      net,
      bigBlind: hand.config.bigBlind,
      showdown: res?.description,
      replay: {
        seed: hand.seed,
        button: hand.button,
        stacks: get().handStacks,
        names: hand.seats.map((s) => s.name),
        humanSeat: humanIdx,
        actions,
      },
      decisions: [],
    };
    void addHand(record).then(() => schedulePush());
    set({ phase: "hand_over", sessionHands: get().sessionHands + 1, sessionNet: get().sessionNet + net });
  };

  return {
    session: null,
    hand: null,
    seatMap: [],
    phase: "idle",
    level: "easy",
    actions: [],
    handStacks: [],
    botDelay: 1,
    playerName: "CAM",
    sessionHands: 0,
    sessionNet: 0,

    startSession(level, playerName) {
      if (botTimer) clearTimeout(botTimer);
      const players = [{ name: playerName, bot: null as BotLevel | null }, ...BOT_NAMES.map((name) => ({ name, bot: level as BotLevel | null }))];
      const session = createSession(players, DEFAULT_CONFIG);
      set({ session, hand: null, phase: "idle", level, playerName, actions: [], sessionHands: 0, sessionNet: 0 });
      get().deal();
    },

    endSession() {
      if (botTimer) clearTimeout(botTimer);
      set({ session: null, hand: null, phase: "idle", actions: [] });
    },

    deal() {
      const { session } = get();
      if (!session) return;
      applyRebuys(session, false);
      const human = session.players[HUMAN_SEAT]!;
      if (human.stack <= 0) {
        set({ phase: "hand_over" }); // la UI mostra il pulsante di ricarica
        return;
      }
      const seatMap = engineIndexToSeat(session);
      const handStacks = seatMap.map((s) => session.players[s]!.stack);
      const hand = nextHand(session);
      set({ hand, seatMap, handStacks, phase: "playing", actions: [] });
      advance();
    },

    humanAction(action) {
      const { hand, seatMap, actions } = get();
      if (!hand) return;
      const legal = legalActions(hand);
      if (!legal || seatMap[legal.seat] !== HUMAN_SEAT) return;
      const next = applyAction(hand, action);
      set({ hand: next, actions: [...actions, action] });
      advance();
    },

    rebuyHuman() {
      const { session } = get();
      if (!session) return;
      applyRebuys(session, true);
      get().deal();
    },

    setBotDelay(d) {
      set({ botDelay: d });
    },
  };
});

/** Vero se tocca all'utente. */
export function isHumanTurn(hand: HandState | null, seatMap: number[]): boolean {
  if (!hand) return false;
  const legal = legalActions(hand);
  return !!legal && seatMap[legal.seat] === HUMAN_SEAT;
}

export { HUMAN_SEAT };
