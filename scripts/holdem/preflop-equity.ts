/**
 * Genera data/holdem/preflop-equity.json: equity preflop delle 169 mani iniziali
 * contro 1, 2 e 5 avversari con carte casuali (Monte Carlo).
 *
 * Uso: npm run gen:preflop [-- --samples 100000]
 *
 * È la base per i range dei bot (Fase 1) e per la lezione sulle mani di partenza (Fase 2).
 * Nota metodologica: l'equity contro carte CASUALI non è l'equity contro un range reale;
 * sopravvaluta un po' le mani speculative (suited connectors) in multiway e sottovaluta le
 * coppie basse. Serve come ordinamento di partenza, etichettato come tale nelle lezioni.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeCard, RANKS } from "../../src/engine/cards/card";
import { createRng } from "../../src/engine/cards/rng";
import { equityMonteCarlo } from "../../src/strategy/equity";

const args = process.argv.slice(2);
const samplesArg = args.indexOf("--samples");
const SAMPLES = samplesArg >= 0 ? Number(args[samplesArg + 1]) : 100_000;
const OPPONENTS = [1, 2, 5] as const;
const SEED = 20261111;

interface Row {
  hand: string;
  /** Numero di combinazioni di carte (6 per le coppie, 4 suited, 12 offsuit). */
  combos: number;
  equity: Record<string, number>;
  stderr: Record<string, number>;
}

const rows: Row[] = [];
const rng = createRng(SEED);
const t0 = Date.now();

for (let hi = 12; hi >= 0; hi--) {
  for (let lo = hi; lo >= 0; lo--) {
    const variants = hi === lo ? [["", 6]] : [["s", 4], ["o", 12]];
    for (const [suffix, combos] of variants as [string, number][]) {
      const label = RANKS[hi]! + RANKS[lo]! + suffix;
      // Carte rappresentative: i semi non contano per l'equity media contro carte casuali.
      const hero = suffix === "s" ? [makeCard(hi, 2), makeCard(lo, 2)] : [makeCard(hi, 2), makeCard(lo, 3)];
      const equity: Record<string, number> = {};
      const stderr: Record<string, number> = {};
      for (const n of OPPONENTS) {
        const r = equityMonteCarlo({ hero, opponents: n, samples: SAMPLES, rng });
        equity[`vs${n}`] = Number(r.equity.toFixed(4));
        stderr[`vs${n}`] = Number(r.stderr.toFixed(4));
      }
      rows.push({ hand: label, combos, equity, stderr });
      process.stdout.write(`${label.padEnd(4)} vs1 ${equity.vs1}  vs2 ${equity.vs2}  vs5 ${equity.vs5}\n`);
    }
  }
}

/** Ordinamenti utili ai bot: percentile di ogni mano per equity vs1 e vs5, pesato per combos (1326 totali). */
function percentiles(key: string): Record<string, number> {
  const sorted = [...rows].sort((a, b) => b.equity[key]! - a.equity[key]!);
  const out: Record<string, number> = {};
  let cum = 0;
  for (const r of sorted) {
    cum += r.combos;
    out[r.hand] = Number((cum / 1326).toFixed(4)); // quota di combos con equity ≥ questa mano
  }
  return out;
}

const output = {
  generatedAt: new Date().toISOString(),
  method: "Monte Carlo, avversari con carte casuali, board completo casuale",
  samplesPerHand: SAMPLES,
  seed: SEED,
  opponents: OPPONENTS,
  hands: rows,
  /** topPercent[key][hand] = frazione delle 1326 combinazioni con equity ≥ quella mano (0,02 = top 2 %). */
  topPercent: { vs1: percentiles("vs1"), vs5: percentiles("vs5") },
};

const outPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../data/holdem/preflop-equity.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n");
console.log(`\nScritto ${outPath} in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
