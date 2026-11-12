/**
 * Contrasti dei colori del design system, letti direttamente da tokens.css.
 * Soglie WCAG / Apple HIG: 4,5:1 per il testo normale, 3:1 per testo grande o grassetto e per i simboli.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../../src/ui/styles/tokens.css", import.meta.url), "utf8");
function token(name: string): string {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`token --${name} non trovato o non esadecimale`);
  return m[1]!;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
export function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1! + 0.05) / (l2! + 0.05);
}

const CARD = "#fbf7ec"; // fondo delle carte (cards.css)

describe("contrasti", () => {
  const bgs = ["green-900", "green-850", "green-950"];
  for (const bg of bgs) {
    it(`testo principale e secondario su ${bg} ≥ 4,5:1`, () => {
      expect(contrast(token("paper"), token(bg))).toBeGreaterThanOrEqual(4.5);
      expect(contrast(token("paper-dim"), token(bg))).toBeGreaterThanOrEqual(4.5);
    });
    it(`etichette brevi su ${bg} ≥ 4,5:1`, () => {
      expect(contrast(token("paper-faint"), token(bg))).toBeGreaterThanOrEqual(4.5);
    });
  }
  it("testo sul pulsante corallo ≥ 4,5:1", () => {
    expect(contrast(token("on-accent"), token("coral"))).toBeGreaterThanOrEqual(4.5);
  });
  it("corallo (tab attiva, accento) sul fondo ≥ 3:1", () => {
    expect(contrast(token("coral"), token("green-950"))).toBeGreaterThanOrEqual(3);
  });
  it("semi e valori rossi sulla carta ≥ 4,5:1, neri ≥ 7:1", () => {
    expect(contrast(token("red-suit"), CARD)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token("ink"), CARD)).toBeGreaterThanOrEqual(7);
  });
  it("vinto / perso leggibili sul fondo", () => {
    expect(contrast(token("win"), token("green-900"))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token("loss"), token("green-900"))).toBeGreaterThanOrEqual(4.5);
  });
});
