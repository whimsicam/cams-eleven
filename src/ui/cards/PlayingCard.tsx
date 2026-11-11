/**
 * Carta da gioco in SVG, nello stile piatto del poster di riferimento:
 * fondo crema, pips grandi, indice rank+seme negli angoli, figure rese come lettera grande.
 * Il retro è un pattern a scacchi. Flip animato via CSS (vedi cards.css).
 */
import { rankOf, suitOf, SUIT_SYMBOLS, type Card } from "../../engine/cards/card";
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
  style?: React.CSSProperties;
}

const RANK_LABEL = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

/** Posizioni dei pips (x, y, flipped) per le carte numeriche, in un viewBox 100×140. */
const PIP_LAYOUT: Record<number, Array<[number, number, boolean]>> = {
  2: [[50, 38, false], [50, 102, true]],
  3: [[50, 38, false], [50, 70, false], [50, 102, true]],
  4: [[34, 38, false], [66, 38, false], [34, 102, true], [66, 102, true]],
  5: [[34, 38, false], [66, 38, false], [50, 70, false], [34, 102, true], [66, 102, true]],
  6: [[34, 38, false], [66, 38, false], [34, 70, false], [66, 70, false], [34, 102, true], [66, 102, true]],
  7: [[34, 38, false], [66, 38, false], [50, 54, false], [34, 70, false], [66, 70, false], [34, 102, true], [66, 102, true]],
  8: [[34, 38, false], [66, 38, false], [50, 54, false], [34, 70, false], [66, 70, false], [50, 86, true], [34, 102, true], [66, 102, true]],
  9: [[34, 34, false], [66, 34, false], [34, 58, false], [66, 58, false], [50, 70, false], [34, 82, true], [66, 82, true], [34, 106, true], [66, 106, true]],
  10: [[34, 34, false], [66, 34, false], [50, 46, false], [34, 58, false], [66, 58, false], [34, 82, true], [66, 82, true], [50, 94, true], [34, 106, true], [66, 106, true]],
};

/** Simbolo del seme come path SVG centrato in (0,0), dimensione ~1 unità. */
function SuitGlyph({ suit, size, x, y, flipped = false }: { suit: number; size: number; x: number; y: number; flipped?: boolean }) {
  const t = `translate(${x} ${y}) scale(${size}) ${flipped ? "rotate(180)" : ""}`;
  const paths = [
    // fiori
    "M0 -0.55c-0.3 0-0.52 0.22-0.52 0.5 0 0.1 0.03 0.2 0.08 0.28-0.07-0.04-0.15-0.06-0.24-0.06-0.3 0-0.52 0.22-0.52 0.5s0.22 0.5 0.52 0.5c0.22 0 0.4-0.12 0.48-0.3L-0.3 1.1h0.6l-0.1-0.73c0.08 0.18 0.26 0.3 0.48 0.3 0.3 0 0.52-0.22 0.52-0.5s-0.22-0.5-0.52-0.5c-0.09 0-0.17 0.02-0.24 0.06 0.05-0.08 0.08-0.18 0.08-0.28 0-0.28-0.22-0.5-0.52-0.5z",
    // quadri
    "M0 -1L0.72 0 0 1-0.72 0z",
    // cuori
    "M0 1C-0.2 0.7-1 0.2-1-0.4-1-0.75-0.72-1-0.45-1-0.25-1-0.08-0.88 0-0.72 0.08-0.88 0.25-1 0.45-1 0.72-1 1-0.75 1-0.4 1 0.2 0.2 0.7 0 1z",
    // picche
    "M0 -1C0.2-0.7 1-0.2 1 0.4 1 0.75 0.72 0.95 0.45 0.95 0.25 0.95 0.1 0.86 0.02 0.75L0.3 1.2h-0.6l0.28-0.45C-0.1 0.86-0.25 0.95-0.45 0.95-0.72 0.95-1 0.75-1 0.4-1-0.2-0.2-0.7 0-1z",
  ];
  return <path d={paths[suit]} transform={t} className="card-suit" />;
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

  return (
    <svg className={cls} viewBox="0 0 100 140" width={width} height={height} style={style} role="img" aria-label={showBack ? "carta coperta" : `${label} di ${SUIT_SYMBOLS[suit]}`}>
      <rect x="1" y="1" width="98" height="138" rx="9" className="pcard-bg" />
      {showBack ? (
        <>
          <defs>
            <pattern id="pcard-check" width="12" height="12" patternUnits="userSpaceOnUse">
              <rect width="6" height="6" className="pcard-check" />
              <rect x="6" y="6" width="6" height="6" className="pcard-check" />
            </pattern>
          </defs>
          <rect x="9" y="9" width="82" height="122" rx="4" fill="url(#pcard-check)" />
        </>
      ) : (
        <>
          {/* Indici negli angoli */}
          <text x="8" y="22" className="pcard-rank">{label}</text>
          <SuitGlyph suit={suit} size={6.5} x={13} y={32} />
          <g transform="rotate(180 50 70)">
            <text x="8" y="22" className="pcard-rank">{label}</text>
            <SuitGlyph suit={suit} size={6.5} x={13} y={32} />
          </g>
          {rank <= 8 ? (
            PIP_LAYOUT[rank + 2]!.map(([x, y, f], i) => <SuitGlyph key={i} suit={suit} size={rank <= 4 ? 10 : 8.5} x={x} y={y} flipped={f} />)
          ) : rank === 12 ? (
            <SuitGlyph suit={suit} size={30} x={50} y={70} />
          ) : (
            <>
              <text x="50" y="86" className="pcard-court">{label}</text>
              <SuitGlyph suit={suit} size={9} x={50} y={108} />
            </>
          )}
        </>
      )}
    </svg>
  );
}
