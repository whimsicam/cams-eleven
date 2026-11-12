/**
 * Simmetria dei semi e degli emblemi: per ogni sotto-path chiuso, l'insieme dei punti
 * (estremi e controlli) specchiato rispetto all'asse verticale coincide con sé stesso.
 * I cerchi dei fiori sono simmetrici come insieme (lobo sinistro ↔ lobo destro).
 */
import { describe, expect, it } from "vitest";
import { COURT_EMBLEMS, mirrored, SUIT_PATHS } from "../../src/ui/cards/suits";

/** Estrae tutte le coppie di coordinate assolute dai comandi M, L, C (i path generati usano solo questi più gli archi relativi dei cerchi). */
function absolutePoints(d: string): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const m of d.matchAll(/([MLC])([^MLCZa]*)/g)) {
    // I cerchi ("M… a…") sono controllati a parte: il loro punto di partenza è sul bordo sinistro.
    if (d[m.index! + m[0].length] === "a") continue;
    const nums = m[2]!.trim().split(/[\s,]+/).filter(Boolean).map(Number);
    for (let i = 0; i + 1 < nums.length; i += 2) out.push([nums[i]!, nums[i + 1]!]);
  }
  return out;
}

function isMirrorSymmetric(points: Array<[number, number]>): boolean {
  const key = (x: number, y: number) => `${Math.round(x * 1000)},${Math.round(y * 1000)}`;
  const set = new Set(points.map(([x, y]) => key(x, y)));
  return points.every(([x, y]) => set.has(key(-x, y)));
}

describe("semi simmetrici", () => {
  const names = ["fiori", "quadri", "cuori", "picche"];
  SUIT_PATHS.forEach((d, i) => {
    it(`${names[i]}: ogni punto ha il suo specchio`, () => {
      expect(isMirrorSymmetric(absolutePoints(d))).toBe(true);
    });
  });

  it("i lobi laterali dei fiori sono alla stessa altezza e distanza dall'asse", () => {
    const circles = [...SUIT_PATHS[0]!.matchAll(/M(-?[\d.]+) (-?[\d.]+)a([\d.]+)/g)].map((m) => ({ x: Number(m[1]) + Number(m[3]), y: Number(m[2]) }));
    expect(circles).toHaveLength(3);
    const [top, left, right] = circles;
    expect(top!.x).toBeCloseTo(0, 6);
    expect(left!.y).toBeCloseTo(right!.y, 6);
    expect(left!.x).toBeCloseTo(-right!.x, 6);
  });

  for (const [k, d] of Object.entries(COURT_EMBLEMS)) {
    it(`emblema ${k} simmetrico`, () => {
      expect(isMirrorSymmetric(absolutePoints(d))).toBe(true);
    });
  }

  it("mirrored rifiuta metà che non partono o non finiscono sull'asse", () => {
    expect(() => mirrored([0.1, 0], [{ l: [0, 1] }])).toThrow();
    expect(() => mirrored([0, 0], [{ l: [0.5, 1] }])).toThrow();
  });
});
