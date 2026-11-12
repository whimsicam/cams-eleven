/** Carta in miniatura (valore + seme grandi), per esempi e liste dove la carta intera sarebbe illeggibile. */
import { rankOf, suitOf, SUIT_NAMES_IT, type Card } from "../../engine/cards/card";
import { SUIT_PATHS } from "./suits";
import "./minicard.css";

const LABEL = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"] as const;

export function MiniCard({ card }: { card: Card }) {
  const r = rankOf(card), s = suitOf(card), red = s === 1 || s === 2;
  return (
    <svg className={`minicard ${red ? "minicard-red" : ""}`} viewBox="0 0 30 40" width="30" height="40" role="img" aria-label={`${LABEL[r]} di ${SUIT_NAMES_IT[s]}`}>
      <rect x="0.5" y="0.5" width="29" height="39" rx="4" className="minicard-bg" />
      <text x="15" y="17" className="minicard-rank">
        {LABEL[r]}
      </text>
      <path d={SUIT_PATHS[s]} transform="translate(15 28) scale(6.2)" className="minicard-suit" />
    </svg>
  );
}
