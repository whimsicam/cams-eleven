/**
 * Equity Hold'em: Monte Carlo e enumerazione esatta.
 *
 * Equity = probabilità di vincere il piatto allo showdown (le divisioni contano in quota).
 * Usata dai bot, dal coach e dagli script che generano le tabelle in data/.
 *
 * Prestazioni: l'evaluator fa milioni di valutazioni al secondo, quindi 2 000 campioni
 * contro 5 avversari costano pochi millisecondi. Per il coach si usa il Web Worker.
 */
import { type Card } from "../engine/cards/card";
import { remainingCards } from "../engine/cards/deck";
import { evaluate } from "../engine/cards/evaluator";
import { type Rng } from "../engine/cards/rng";

export interface EquityResult {
  /** Quota di piatto attesa: vittorie + divisioni pesate. In [0, 1]. */
  equity: number;
  win: number;
  tie: number;
  samples: number;
  /** Errore standard stimato dell'equity (solo Monte Carlo). */
  stderr: number;
}

export interface EquityOptions {
  hero: readonly Card[];
  board?: readonly Card[];
  /** Avversari: numero (carte sconosciute) o carte note per ciascuno. */
  opponents: number | readonly (readonly Card[])[];
  samples: number;
  rng: Rng;
}

/** Monte Carlo: completa board e carte sconosciute degli avversari con pescate casuali. */
export function equityMonteCarlo(opts: EquityOptions): EquityResult {
  const board = opts.board ?? [];
  const knownOpp = typeof opts.opponents === "number" ? [] : opts.opponents;
  const nOpp = typeof opts.opponents === "number" ? opts.opponents : opts.opponents.length;
  if (opts.hero.length !== 2) throw new Error("hero deve avere 2 carte");
  if (board.length > 5) throw new Error("board al massimo 5 carte");

  const used = [...opts.hero, ...board, ...knownOpp.flat()];
  const pool = remainingCards(used);
  const needBoard = 5 - board.length;
  const needOpp = typeof opts.opponents === "number" ? 2 * nOpp : 0;
  const needed = needBoard + needOpp;
  if (needed > pool.length) throw new Error("Carte insufficienti per la simulazione");

  const rng = opts.rng;
  let winSum = 0, tieSum = 0, shareSum = 0, shareSq = 0;
  const full = new Array<Card>(7);
  const oppHand = new Array<Card>(7);

  for (let t = 0; t < opts.samples; t++) {
    // Pesca parziale di Fisher–Yates: solo le prime `needed` posizioni.
    for (let i = 0; i < needed; i++) {
      const j = i + rng.int(pool.length - i);
      const tmp = pool[i]!;
      pool[i] = pool[j]!;
      pool[j] = tmp;
    }
    // Board completo
    for (let i = 0; i < board.length; i++) full[i] = board[i]!;
    for (let i = 0; i < needBoard; i++) full[board.length + i] = pool[i]!;
    full[5] = opts.hero[0]!;
    full[6] = opts.hero[1]!;
    const heroScore = evaluate(full);

    let best = -1, ties = 0;
    for (let o = 0; o < nOpp; o++) {
      for (let i = 0; i < 5; i++) oppHand[i] = full[i]!;
      if (typeof opts.opponents === "number") {
        oppHand[5] = pool[needBoard + 2 * o]!;
        oppHand[6] = pool[needBoard + 2 * o + 1]!;
      } else {
        oppHand[5] = knownOpp[o]![0]!;
        oppHand[6] = knownOpp[o]![1]!;
      }
      const sc = evaluate(oppHand);
      if (sc > best) {
        best = sc;
        ties = 1;
      } else if (sc === best) ties++;
    }
    let share = 0;
    if (heroScore > best) {
      share = 1;
      winSum++;
    } else if (heroScore === best) {
      share = 1 / (ties + 1);
      tieSum++;
    }
    shareSum += share;
    shareSq += share * share;
  }

  const n = opts.samples;
  const mean = shareSum / n;
  const variance = Math.max(0, shareSq / n - mean * mean);
  return { equity: mean, win: winSum / n, tie: tieSum / n, samples: n, stderr: Math.sqrt(variance / n) };
}

/**
 * Enumerazione esatta contro avversari con carte note, quando mancano al più 2 carte al board
 * (turn: 45–46 combinazioni, river: nessuna). Per il coach sul turn e sul river.
 */
export function equityExact(hero: readonly Card[], board: readonly Card[], opponents: readonly (readonly Card[])[]): EquityResult {
  const used = [...hero, ...board, ...opponents.flat()];
  const pool = remainingCards(used);
  const need = 5 - board.length;
  if (need > 2) throw new Error("equityExact: usare il Monte Carlo con più di 2 carte mancanti");
  let shareSum = 0, win = 0, tie = 0, n = 0;
  const score = (b: readonly Card[], hand: readonly Card[]) => evaluate([...b, ...hand]);
  const run = (b: readonly Card[]) => {
    const h = score(b, hero);
    let best = -1, ties = 0;
    for (const o of opponents) {
      const sc = score(b, o);
      if (sc > best) {
        best = sc;
        ties = 1;
      } else if (sc === best) ties++;
    }
    n++;
    if (h > best) {
      win++;
      shareSum += 1;
    } else if (h === best) {
      tie++;
      shareSum += 1 / (ties + 1);
    }
  };
  if (need === 0) run(board);
  else if (need === 1) for (const c of pool) run([...board, c]);
  else for (let i = 0; i < pool.length; i++) for (let j = i + 1; j < pool.length; j++) run([...board, pool[i]!, pool[j]!]);
  return { equity: shareSum / n, win: win / n, tie: tie / n, samples: n, stderr: 0 };
}

/** Equity minima per chiamare: toCall / (pot + toCall). "Pot odds" espresse come percentuale di break-even. */
export function breakEvenEquity(toCall: number, potBeforeCall: number): number {
  if (toCall <= 0) return 0;
  return toCall / (potBeforeCall + toCall);
}
