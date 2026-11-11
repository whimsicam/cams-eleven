/**
 * Il tavolo: ovale verde con i 6 seat disposti intorno, board e piatto al centro.
 * L'utente è sempre in basso (seat 0 del tavolo). Layout in percentuali: funziona
 * sia in verticale su iPhone sia su desktop.
 */
import { legalActions, potSize } from "../../engine/holdem/engine";
import type { HandState } from "../../engine/holdem/types";
import type { TableSession } from "../../engine/holdem/table";
import { PlayingCard } from "../cards/PlayingCard";
import { fmtChips } from "../format";
import { HUMAN_SEAT } from "../store/game";
import { Seat } from "./Seat";
import "./table.css";

export interface TableProps {
  session: TableSession;
  hand: HandState | null;
  seatMap: number[];
  showAllCards: boolean;
}

/** Posizioni dei 6 seat (in % del contenitore), partendo dal basso in senso orario. */
const SEAT_POS: Array<{ left: number; top: number }> = [
  { left: 50, top: 88 },
  { left: 11, top: 68 },
  { left: 13, top: 32 },
  { left: 50, top: 14 },
  { left: 87, top: 32 },
  { left: 89, top: 68 },
];

export function Table({ session, hand, seatMap, showAllCards }: TableProps) {
  const legal = hand ? legalActions(hand) : null;
  const actingTable = legal ? seatMap[legal.seat] : -1;
  const buttonTable = hand ? seatMap[hand.button] : -1;
  const pot = hand ? potSize(hand) : 0;
  const boardCardWidth = typeof window !== "undefined" && window.innerWidth < 720 ? 42 : 56;
  const winners = new Set((hand?.results ?? []).filter((r) => r.won > 0).map((r) => seatMap[r.seat]));

  return (
    <div className="table">
      <div className="table-felt" />
      <div className="table-center">
        {hand && (
          <>
            <div className="table-pot label">
              piatto <span className="mono table-pot-n">{fmtChips(pot)}</span>
            </div>
            <div className="table-board">
              {hand.board.map((c, i) => (
                <PlayingCard key={`${c}-${i}`} card={c} width={boardCardWidth} className="pcard-deal" />
              ))}
              {hand.board.length === 0 && <div className="table-board-empty label">{hand.street === "preflop" ? "preflop" : ""}</div>}
            </div>
          </>
        )}
      </div>
      {session.players.map((p) => {
        const engineIdx = seatMap.indexOf(p.seat);
        const seatState = hand && engineIdx >= 0 ? (hand.seats[engineIdx] ?? null) : null;
        return (
          <Seat
            key={p.seat}
            style={{ left: `${SEAT_POS[p.seat]!.left}%`, top: `${SEAT_POS[p.seat]!.top}%` }}
            player={p}
            state={seatState}
            isHuman={p.seat === HUMAN_SEAT}
            isActing={actingTable === p.seat}
            isButton={buttonTable === p.seat}
            isWinner={winners.has(p.seat)}
            showCards={p.seat === HUMAN_SEAT || showAllCards || !!seatState?.showed}
            handOver={hand?.street === "done"}
          />
        );
      })}
    </div>
  );
}
