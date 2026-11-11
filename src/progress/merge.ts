/**
 * Merge deterministico dei progressi (SPEC.md §9.3):
 * - hands e drills: union per id;
 * - lessons: vince lo stato più avanzato (done > started > new);
 * - srs e settings: vince l'updatedAt più recente del dispositivo che li ha scritti;
 * - bankroll: ricalcolato dalle mani.
 *
 * Funzione pura: facile da testare (tests/progress/merge.test.ts).
 */
import type { GameId, LessonProgress, ProgressData } from "./types";

const LESSON_ORDER: Record<LessonProgress["status"], number> = { new: 0, started: 1, done: 2 };

export function mergeProgress(parts: readonly ProgressData[], deviceId: string): ProgressData {
  if (parts.length === 0) throw new Error("mergeProgress: nessun dato");
  const sorted = [...parts].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt)); // dal più vecchio
  const newest = sorted[sorted.length - 1]!;

  const hands = new Map<string, ProgressData["hands"][number]>();
  const drills = new Map<string, ProgressData["drills"][number]>();
  const lessons: ProgressData["lessons"] = {};
  const srs: ProgressData["srs"] = {};

  for (const p of sorted) {
    for (const h of p.hands) hands.set(h.id, h);
    for (const d of p.drills) drills.set(d.id, d);
    for (const [id, l] of Object.entries(p.lessons)) {
      const cur = lessons[id];
      if (!cur || LESSON_ORDER[l.status] >= LESSON_ORDER[cur.status]) lessons[id] = l;
    }
    for (const [id, item] of Object.entries(p.srs)) {
      const cur = srs[id];
      if (!cur || item.lastReview >= cur.lastReview) srs[id] = item;
    }
  }

  const handList = [...hands.values()].sort((a, b) => a.ts.localeCompare(b.ts));
  const bankroll: Record<GameId, number> = { holdem: 0, blackjack: 0, draw: 0 };
  for (const h of handList) bankroll[h.game] += h.net;

  return {
    schema: newest.schema,
    deviceId,
    updatedAt: newest.updatedAt,
    hands: handList,
    drills: [...drills.values()].sort((a, b) => a.ts.localeCompare(b.ts)),
    lessons,
    srs,
    bankroll,
    settings: { ...newest.settings },
  };
}
