/** Un giocatore al tavolo: nome, stack, puntata corrente, carte, button, stato (fold/all-in). */
import type { CSSProperties } from "react";
import type { SeatState } from "../../engine/holdem/types";
import type { TablePlayer } from "../../engine/holdem/table";
import { PlayingCard } from "../cards/PlayingCard";
import { fmtChips } from "../format";

export interface SeatProps {
  style: CSSProperties;
  player: TablePlayer;
  state: SeatState | null;
  isHuman: boolean;
  isActing: boolean;
  isButton: boolean;
  isWinner: boolean;
  showCards: boolean;
  handOver: boolean | undefined;
}

export function Seat({ style, player, state, isHuman, isActing, isButton, isWinner, showCards, handOver }: SeatProps) {
  const folded = state?.folded ?? false;
  const cls = ["seat", isHuman ? "seat-human" : "", isActing ? "seat-acting" : "", folded ? "seat-folded" : "", isWinner ? "seat-winner" : "", state ? "" : "seat-out"]
    .filter(Boolean)
    .join(" ");
  const cardWidth = isHuman ? 72 : 36;
  const stack = state ? state.stack : player.stack;

  return (
    <div className={cls} style={style}>
      {state && state.holeCards.length > 0 && (
        <div className="seat-cards">
          {state.holeCards.map((c, i) => (
            <PlayingCard key={i} card={showCards ? c : undefined} faceDown={!showCards} width={cardWidth} dimmed={folded} highlight={isWinner && !!handOver} className="pcard-deal" style={{ animationDelay: `${i * 90}ms` }} />
          ))}
        </div>
      )}
      <div className="seat-plate">
        <div className="seat-name">
          {player.name}
          {isButton && <span className="seat-button" title="Dealer button">D</span>}
        </div>
        <div className="seat-stack mono">{state?.allIn ? "ALL-IN" : fmtChips(stack)}</div>
      </div>
      {state && state.streetBet > 0 && (
        <div className="seat-bet mono">
          <span className="chip" />
          {fmtChips(state.streetBet)}
        </div>
      )}
    </div>
  );
}
