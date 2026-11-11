import { describe, expect, it } from "vitest";
import { mergeProgress } from "../../src/progress/merge";
import { emptyProgress, type HandRecord } from "../../src/progress/types";

const hand = (id: string, ts: string, net: number): HandRecord => ({
  id,
  game: "holdem",
  ts,
  mode: "play",
  level: "easy",
  net,
  bigBlind: 2,
  replay: { seed: 1, button: 0, stacks: [], names: [], humanSeat: 0, actions: [] },
  decisions: [],
});

describe("mergeProgress", () => {
  it("unisce le mani per id senza duplicati e ricalcola il bankroll", () => {
    const a = { ...emptyProgress("iphone"), updatedAt: "2026-01-02T00:00:00Z", hands: [hand("i-1", "2026-01-01T10:00:00Z", 10), hand("i-2", "2026-01-01T11:00:00Z", -4)] };
    const b = { ...emptyProgress("desktop"), updatedAt: "2026-01-03T00:00:00Z", hands: [hand("i-1", "2026-01-01T10:00:00Z", 10), hand("d-1", "2026-01-02T09:00:00Z", 7)] };
    const m = mergeProgress([a, b], "iphone");
    expect(m.hands.map((h) => h.id)).toEqual(["i-1", "i-2", "d-1"]);
    expect(m.bankroll.holdem).toBe(13);
    expect(m.deviceId).toBe("iphone");
    expect(m.updatedAt).toBe("2026-01-03T00:00:00Z");
  });

  it("per le lezioni vince lo stato più avanzato, per srs il review più recente, per settings il più recente", () => {
    const a = { ...emptyProgress("a"), updatedAt: "2026-01-05T00:00:00Z", lessons: { l1: { status: "done" as const } }, srs: { x: { ease: 2.5, interval: 1, due: "2026-01-06", lastReview: "2026-01-05" } } };
    const b = { ...emptyProgress("b"), updatedAt: "2026-01-04T00:00:00Z", lessons: { l1: { status: "started" as const }, l2: { status: "started" as const } }, srs: { x: { ease: 2.2, interval: 3, due: "2026-01-09", lastReview: "2026-01-06" } } };
    a.settings.playerName = "Nuovo";
    b.settings.playerName = "Vecchio";
    const m = mergeProgress([b, a], "a");
    expect(m.lessons.l1!.status).toBe("done");
    expect(m.lessons.l2!.status).toBe("started");
    expect(m.srs.x!.interval).toBe(3);
    expect(m.settings.playerName).toBe("Nuovo");
  });

  it("è idempotente", () => {
    const a = { ...emptyProgress("a"), updatedAt: "2026-01-05T00:00:00Z", hands: [hand("a-1", "2026-01-01T10:00:00Z", 3)] };
    const once = mergeProgress([a], "a");
    const twice = mergeProgress([once, a], "a");
    expect(twice).toEqual(once);
  });
});
