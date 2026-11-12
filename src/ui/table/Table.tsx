/**
 * Il tavolo: feltro a forma di stadio, i 5 bot intorno, piatto e board al centro.
 *
 * L'utente NON sta sul tavolo: la sua mano è nella fascia sotto (HeroStrip in Gioca.tsx),
 * così le sue carte sono grandi e non si sovrappongono mai ai pulsanti.
 * Le dimensioni delle carte seguono la larghezza reale del tavolo (ResizeObserver).
 */
import { useEffect, useRef, useState } from "react";
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

/** Posizioni dei seat dei bot (1–5), in % del tavolo, in senso orario dal basso a sinistra. */
const SEAT_POS: Record<number, { x: number; y: number }> = {
  1: { x: 12, y: 71 },
  2: { x: 12, y: 29 },
  3: { x: 50, y: 11 },
  4: { x: 88, y: 29 },
  5: { x: 88, y: 71 },
};
/** Il punto verso cui si spostano le fiches puntate (centro del tavolo). */
const CENTER = { x: 50, y: 50 };

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 360, h: 420 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e!.contentRect.width, h: e!.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

export function Table({ session, hand, seatMap, showAllCards }: TableProps) {
  const [ref, { w: width, h: height }] = useSize<HTMLDivElement>();
  const legal = hand ? legalActions(hand) : null;
  const actingTable = legal ? seatMap[legal.seat] : -1;
  const buttonTable = hand ? seatMap[hand.button] : -1;
  const pot = hand ? potSize(hand) : 0;
  const winners = new Set((hand?.results ?? []).filter((r) => r.won > 0).map((r) => seatMap[r.seat]));
  // Board: 5 carte + 4 spazi stanno nel 56% della larghezza (fuori restano i seat laterali),
  // alte al massimo il 20% del tavolo, mai oltre 66 px di larghezza.
  const boardW = Math.max(30, Math.min(66, Math.floor((width * 0.56 - 4 * 6) / 5), Math.floor((height * 0.2 * 100) / 140)));
  const botCardW = Math.min(34, Math.max(24, Math.round(width * 0.07)));

  return (
    <div className="table" ref={ref}>
      <div className="table-felt" />
      <div className="table-center">
        {hand && (
          <>
            <div className="table-pot" aria-live="polite">
              <span className="table-pot-label">Pot</span> <b className="num">{fmtChips(pot)}</b>
            </div>
            <div className="table-board" style={{ minHeight: (boardW * 140) / 100 }}>
              {[0, 1, 2, 3, 4].map((i) =>
                hand.board[i] !== undefined ? (
                  <PlayingCard key={`${hand.handId}-${i}`} card={hand.board[i]} width={boardW} className="pcard-deal" />
                ) : (
                  <div key={i} className="board-slot" style={{ width: boardW, height: (boardW * 140) / 100 }} />
                ),
              )}
            </div>
          </>
        )}
      </div>
      {session.players
        .filter((p) => p.seat !== HUMAN_SEAT)
        .map((p) => {
          const engineIdx = seatMap.indexOf(p.seat);
          const seatState = hand && engineIdx >= 0 ? (hand.seats[engineIdx] ?? null) : null;
          const pos = SEAT_POS[p.seat]!;
          // Le fiches puntate stanno a metà strada tra il giocatore e il centro.
          const bet = { x: pos.x + (CENTER.x - pos.x) * 0.42, y: pos.y + (CENTER.y - pos.y) * 0.42 };
          return (
            <Seat
              key={p.seat}
              pos={pos}
              betPos={bet}
              player={p}
              state={seatState}
              isActing={actingTable === p.seat}
              isButton={buttonTable === p.seat}
              isWinner={winners.has(p.seat)}
              showCards={showAllCards || !!seatState?.showed}
              cardWidth={botCardW}
              handOver={hand?.street === "done"}
            />
          );
        })}
    </div>
  );
}
