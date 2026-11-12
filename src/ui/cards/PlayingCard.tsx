/**
 * Carta da gioco in SVG (viewBox 100 × 140).
 *
 * - Semi ed emblemi delle figure vengono da suits.ts, simmetrici per costruzione.
 * - Indice (valore + seme) negli angoli, in una colonna stretta che non tocca i pips.
 * - Pips nella disposizione delle carte francesi; quelli della metà inferiore sono ruotati di 180°.
 * - Figure: cornice, emblema (corona, diadema, berretto) in alto e ruotato in basso, seme al centro:
 *   simmetriche sia a specchio sia per rotazione, come le carte vere.
 * - Retro: verde del tavolo con reticolo leggero.
 */
import type { CSSProperties } from "react";
import { rankOf, suitOf, SUIT_NAMES_IT, type Card } from "../../engine/cards/card";
import { COURT_EMBLEMS, SUIT_PATHS } from "./suits";
import "./cards.css";

export interface PlayingCardProps {
  card?: Card;
  /** true = mostra il retro. */
  faceDown?: boolean;
  /** Larghezza in px; l'altezza segue il rapporto 100:140. */
  width?: number;
  className?: string;
  /** Evidenzia (es. carte vincenti allo showdown). */
  highlight?: boolean;
  dimmed?: boolean;
  style?: CSSProperties;
}

const RANK_LABEL = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"] as const;
const RANK_NAME_IT = ["Due", "Tre", "Quattro", "Cinque", "Sei", "Sette", "Otto", "Nove", "Dieci", "Fante", "Regina", "Re", "Asso"] as const;

/** Colonne e righe dei pips. */
const L = 34, C = 50, R = 66;
const PIPS: Record<number, Array<[number, number]>> = {
  2: [[C, 34], [C, 106]],
  3: [[C, 34], [C, 70], [C, 106]],
  4: [[L, 34], [R, 34], [L, 106], [R, 106]],
  5: [[L, 34], [R, 34], [C, 70], [L, 106], [R, 106]],
  6: [[L, 34], [R, 34], [L, 70], [R, 70], [L, 106], [R, 106]],
  7: [[L, 34], [R, 34], [C, 52], [L, 70], [R, 70], [L, 106], [R, 106]],
  8: [[L, 34], [R, 34], [C, 52], [L, 70], [R, 70], [C, 88], [L, 106], [R, 106]],
  9: [[L, 34], [R, 34], [L, 58], [R, 58], [C, 70], [L, 82], [R, 82], [L, 106], [R, 106]],
  10: [[L, 34], [R, 34], [C, 46], [L, 58], [R, 58], [L, 82], [R, 82], [C, 94], [L, 106], [R, 106]],
};
const PIP_SIZE: Record<number, number> = { 2: 11, 3: 11, 4: 10, 5: 10, 6: 9.5, 7: 9, 8: 9, 9: 8.5, 10: 8.5 };

/** Seme centrato in (x, y), raggio ~`size`. Ruotato di 180° se sta nella metà bassa. */
function Pip({ suit, x, y, size, flipped = false }: { suit: number; x: number; y: number; size: number; flipped?: boolean }) {
  return <path d={SUIT_PATHS[suit]} transform={`translate(${x} ${y}) scale(${size})${flipped ? " rotate(180)" : ""}`} className="card-suit" />;
}

/** Indice d'angolo: valore sopra, seme sotto, centrati sulla stessa colonna (x = 12). */
function CornerIndex({ label, suit }: { label: string; suit: number }) {
  return (
    <g>
      <text x="12" y="23" className={`pcard-rank ${label === "10" ? "pcard-rank-10" : ""}`}>
        {label}
      </text>
      <Pip suit={suit} x={12} y={34} size={5.4} />
    </g>
  );
}

export function PlayingCard({ card, faceDown = false, width = 64, className = "", highlight = false, dimmed = false, style }: PlayingCardProps) {
  const height = (width * 140) / 100;
  const showBack = faceDown || card === undefined;
  const rank = card !== undefined ? rankOf(card) : 0;
  const suit = card !== undefined ? suitOf(card) : 0;
  const red = suit === 1 || suit === 2;
  const label = RANK_LABEL[rank]!;
  const cls = ["pcard", showBack ? "pcard-back" : "pcard-face", red ? "pcard-red" : "pcard-black", highlight ? "pcard-hl" : "", dimmed ? "pcard-dim" : "", className]
    .filter(Boolean)
    .join(" ");
  const aria = showBack ? "carta coperta" : `${RANK_NAME_IT[rank]} di ${SUIT_NAMES_IT[suit]}`;

  return (
    <svg className={cls} viewBox="0 0 100 140" width={width} height={height} style={style} role="img" aria-label={aria}>
      <rect x="0.75" y="0.75" width="98.5" height="138.5" rx="9" className="pcard-bg" />
      {showBack ? (
        <>
          <defs>
            <pattern id="pcard-lattice" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <path d="M0 0H10M0 0V10" className="pcard-lattice" />
            </pattern>
          </defs>
          <rect x="7" y="7" width="86" height="126" rx="5" className="pcard-back-field" />
          <rect x="7" y="7" width="86" height="126" rx="5" fill="url(#pcard-lattice)" />
        </>
      ) : (
        <>
          <CornerIndex label={label} suit={suit} />
          <g transform="rotate(180 50 70)">
            <CornerIndex label={label} suit={suit} />
          </g>
          {rank <= 8 &&
            PIPS[rank + 2]!.map(([x, y], i) => <Pip key={i} suit={suit} x={x} y={y} size={PIP_SIZE[rank + 2]!} flipped={y > 70} />)}
          {rank === 12 && <Pip suit={suit} x={50} y={70} size={24} />}
          {rank >= 9 && rank <= 11 && <Court rank={label as "J" | "Q" | "K"} suit={suit} />}
        </>
      )}
    </svg>
  );
}

/** Figura: cornice, emblema in alto e capovolto in basso, seme al centro. */
function Court({ rank, suit }: { rank: "J" | "Q" | "K"; suit: number }) {
  const d = COURT_EMBLEMS[rank];
  return (
    <g>
      <rect x="23" y="17" width="54" height="106" rx="5" className="pcard-frame" />
      <path d={d} transform="translate(50 42) scale(15)" className="card-suit" />
      <path d={d} transform="translate(50 98) scale(15) rotate(180)" className="card-suit" />
      <Pip suit={suit} x={50} y={70} size={8} />
    </g>
  );
}
