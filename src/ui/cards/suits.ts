/**
 * Geometria dei semi e degli emblemi delle figure, simmetrici per costruzione.
 *
 * Ogni forma è descritta solo dalla sua METÀ DESTRA: una sequenza di curve che parte
 * dall'asse verticale (x = 0) in alto e torna sull'asse in basso. `mirrored()` aggiunge
 * la metà sinistra specchiando i punti (x → -x) in ordine inverso, quindi le due metà
 * sono identiche al millesimo. tests/ui/suits.test.ts lo verifica su tutti i path.
 *
 * Coordinate in un quadrato unitario centrato in (0, 0), circa [-1, 1] × [-1, 1].
 */

export type Pt = readonly [number, number];

/** Un segmento della metà destra: retta o cubica, con i punti di controllo. */
export type Seg = { l: Pt } | { c: readonly [Pt, Pt, Pt] };

const f = (n: number): string => {
  const r = Math.round(n * 1000) / 1000;
  return (Object.is(r, -0) ? 0 : r).toString();
};
const pt = (p: Pt): string => `${f(p[0])} ${f(p[1])}`;
const flip = (p: Pt): Pt => [-p[0], p[1]];

/**
 * Path chiuso simmetrico rispetto all'asse verticale.
 * `start` deve stare sull'asse (x = 0) e l'ultimo punto della metà destra pure.
 */
export function mirrored(start: Pt, right: readonly Seg[]): string {
  if (start[0] !== 0) throw new Error("mirrored: il punto di partenza deve stare sull'asse");
  const ends: Pt[] = [start, ...right.map((s) => ("l" in s ? s.l : s.c[2]))];
  const last = ends[ends.length - 1]!;
  if (last[0] !== 0) throw new Error("mirrored: la metà destra deve chiudersi sull'asse");

  let d = `M${pt(start)}`;
  for (const s of right) d += "l" in s ? `L${pt(s.l)}` : `C${pt(s.c[0])} ${pt(s.c[1])} ${pt(s.c[2])}`;
  // Metà sinistra: stessi segmenti percorsi al contrario e specchiati.
  for (let i = right.length - 1; i >= 0; i--) {
    const s = right[i]!;
    const from = ends[i]!; // punto d'arrivo del segmento percorso al contrario
    if ("l" in s) d += `L${pt(flip(from))}`;
    else d += `C${pt(flip(s.c[1]))} ${pt(flip(s.c[0]))} ${pt(flip(from))}`;
  }
  return d + "Z";
}

/** Cerchio come path (due archi, in senso orario come tutte le altre forme: con versi opposti le sovrapposizioni si bucherebbero). */
function circle(cx: number, cy: number, r: number): string {
  return `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 1 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 1 ${f(-2 * r)} 0Z`;
}

/** Cuori: due lobi pieni e punta in basso. */
const HEART = mirrored([0, -0.52], [
  { c: [[0.16, -0.92], [0.98, -1.02], [0.98, -0.3]] },
  { c: [[0.98, 0.22], [0.42, 0.5], [0, 0.98]] },
]);

/** Quadri: rombo con lati leggermente concavi, come nelle carte francesi. */
const DIAMOND = mirrored([0, -1], [
  { c: [[0.22, -0.62], [0.46, -0.3], [0.72, 0]] },
  { c: [[0.46, 0.3], [0.22, 0.62], [0, 1]] },
]);

/** Picche: cuore capovolto più gambo svasato. */
const SPADE = mirrored([0, -1], [
  { c: [[0.36, -0.58], [0.98, -0.3], [0.98, 0.24]] },
  { c: [[0.98, 0.72], [0.42, 0.86], [0.1, 0.56]] },
  { c: [[0.12, 0.82], [0.22, 0.98], [0.42, 1.04]] },
  { l: [0, 1.04] },
]);

/** Fiori: tre lobi tondi (alto, sinistra, destra), un riempitivo centrale e lo stesso gambo delle picche. */
const CLUB_STEM = mirrored([0, 0.1], [
  { l: [0.12, 0.1] },
  { c: [[0.12, 0.62], [0.22, 0.95], [0.42, 1.04]] },
  { l: [0, 1.04] },
]);
const CLUB =
  circle(0, -0.5, 0.44) +
  circle(-0.52, 0.12, 0.44) +
  circle(0.52, 0.12, 0.44) +
  mirrored([0, -0.3], [{ l: [0.3, 0] }, { l: [0, 0.32] }]) +
  CLUB_STEM;

/** Path del seme nell'ordine dell'engine: 0 fiori, 1 quadri, 2 cuori, 3 picche. */
export const SUIT_PATHS: readonly string[] = [CLUB, DIAMOND, HEART, SPADE];

/**
 * Emblemi delle figure (nel quadrato unitario): corona per il Re, diadema per la Regina,
 * cappello piumato stilizzato per il Fante. Tutti simmetrici per costruzione.
 */
export const COURT_EMBLEMS: Readonly<Record<"J" | "Q" | "K", string>> = {
  // Re: corona a tre punte con base piena
  K: mirrored([0, -1], [
    { l: [0.22, -0.3] },
    { l: [0.62, -0.78] },
    { l: [0.8, 0.12] },
    { l: [0.8, 0.5] },
    { l: [0, 0.5] },
  ]) + mirrored([0, 0.62], [{ l: [0.8, 0.62] }, { l: [0.8, 0.86] }, { l: [0, 0.86] }]),
  // Regina: diadema ad archi tondi con base
  Q: mirrored([0, -0.7], [
    { c: [[0.14, -0.7], [0.22, -0.2], [0.34, -0.2]] },
    { c: [[0.48, -0.2], [0.52, -0.66], [0.8, -0.66]] },
    { l: [0.8, 0.5] },
    { l: [0, 0.5] },
  ]) + mirrored([0, 0.62], [{ l: [0.8, 0.62] }, { l: [0.8, 0.86] }, { l: [0, 0.86] }]),
  // Fante: berretto morbido con tesa
  J: mirrored([0, -0.9], [
    { c: [[0.5, -0.9], [0.78, -0.48], [0.78, 0.12]] },
    { c: [[0.94, 0.16], [0.98, 0.3], [0.98, 0.42]] },
    { l: [0, 0.42] },
  ]) + mirrored([0, 0.56], [{ l: [0.86, 0.56] }, { l: [0.86, 0.82] }, { l: [0, 0.82] }]),
};
