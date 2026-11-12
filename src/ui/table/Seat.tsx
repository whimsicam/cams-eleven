/** Un bot al tavolo: carte, nome, stack, dealer button, puntata (spostata verso il centro). */
import type { SeatState } from "../../engine/holdem/types";
import type { TablePlayer } from "../../engine/holdem/table";
import { MiniCard } from "../cards/MiniCard";
import { PlayingCard } from "../cards/PlayingCard";
import { fmtChips } from "../format";

export interface SeatProps {
  pos: { x: number; y: number };
  betPos: { x: number; y: number };
  player: TablePlayer;
  state: SeatState | null;
  isActing: boolean;
  isButton: boolean;
  isWinner: boolean;
  showCards: boolean;
  cardWidth: number;
  handOver: boolean | undefined;
}

export function Seat({ pos, betPos, player, state, isActing, isButton, isWinner, showCards, cardWidth, handOver }: SeatProps) {
  const folded = state?.folded ?? false;
  const cls = ["seat", isActing ? "seat-acting" : "", folded ? "seat-folded" : "", isWinner ? "seat-winner" : "", state ? "" : "seat-out"].filter(Boolean).join(" ");
  const stack = state ? state.stack : player.stack;
  const hasCards = state && state.holeCards.length > 0 && (!folded || showCards);

  return (
    <>
      <div className={cls} style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
        {/* Coperte: due retro piccoli. Scoperte allo showdown: carte in miniatura, leggibili e compatte. */}
        <div className={`seat-cards ${showCards ? "seat-cards-open" : ""} ${isWinner && handOver ? "seat-cards-win" : ""}`} style={{ height: (cardWidth * 140) / 100 }}>
          {hasCards &&
            state.holeCards.map((c, i) =>
              showCards ? (
                <MiniCard key={i} card={c} />
              ) : (
                <PlayingCard key={i} faceDown width={cardWidth} className="pcard-deal" style={{ animationDelay: `${i * 80}ms` }} />
              ),
            )}
        </div>
        <div className="seat-plate">
          <span className="seat-name">{player.name}</span>
          <span className="seat-stack num">{state?.allIn ? "All-in" : fmtChips(stack)}</span>
          {isButton && (
            <span className="dealer-btn" title="Dealer button" aria-label="dealer">
              D
            </span>
          )}
        </div>
      </div>
      {state && state.streetBet > 0 && !handOver && (
        <div className="seat-bet num" style={{ left: `${betPos.x}%`, top: `${betPos.y}%` }}>
          <span className="chip" aria-hidden="true" />
          {fmtChips(state.streetBet)}
        </div>
      )}
    </>
  );
}
