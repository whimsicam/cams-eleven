/**
 * Tendina con la classifica dei punti: si apre dal basso, si chiude toccando fuori,
 * con il pulsante, trascinandola verso il basso o con Esc.
 * Se passi `current`, la riga del tuo punto attuale è evidenziata e portata in vista.
 */
import { useEffect, useRef, useState } from "react";
import { parseCards } from "../../engine/cards/card";
import { HAND_RANKINGS, type RankingId } from "../../engine/cards/handRankings";
import { MiniCard } from "../cards/MiniCard";
import "./rankings.css";

export interface HandRankingsProps {
  open: boolean;
  onClose(): void;
  current?: { id: RankingId; label: string } | null;
}

export function HandRankings({ open, onClose, current }: HandRankingsProps) {
  const sheet = useRef<HTMLDivElement>(null);
  const currentRow = useRef<HTMLLIElement>(null);
  const [drag, setDrag] = useState(0);
  const dragStart = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    // Porta in vista il punto attuale, poi il focus sul foglio per chi usa la tastiera.
    requestAnimationFrame(() => {
      currentRow.current?.scrollIntoView({ block: "center" });
      sheet.current?.focus();
    });
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Trascinamento verso il basso dalla maniglia o dall'intestazione
  const onDown = (e: React.PointerEvent) => {
    dragStart.current = e.clientY;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (dragStart.current === null) return;
    setDrag(Math.max(0, e.clientY - dragStart.current));
  };
  const onUp = () => {
    if (dragStart.current === null) return;
    dragStart.current = null;
    if (drag > 90) onClose();
    setDrag(0);
  };

  return (
    <div className={`sheet-root ${open ? "sheet-open" : ""}`} aria-hidden={!open}>
      <div className="sheet-backdrop" onClick={onClose} />
      <div
        ref={sheet}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rankings-title"
        tabIndex={-1}
        style={drag ? { transform: `translateY(${drag}px)`, transition: "none" } : undefined}
      >
        <div className="sheet-head" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <div className="sheet-grabber" aria-hidden="true" />
          <div className="sheet-titlebar">
            <h2 id="rankings-title">Hand rankings</h2>
            <button className="btn btn-quiet btn-icon" onClick={onClose} aria-label="Chiudi">
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <p className="sheet-sub muted">Dal più forte al più debole. Vince chi ha il punto più alto con 5 carte, scelte tra le sue 2 e le 5 del tavolo.</p>
        </div>
        <ol className="rk-list">
          {HAND_RANKINGS.map((e, i) => {
            const mine = current?.id === e.id;
            return (
              <li key={e.id} ref={mine ? currentRow : undefined} className={`rk-row ${mine ? "rk-mine" : ""}`}>
                <span className="rk-pos" aria-hidden="true">
                  {i + 1}
                </span>
                <div className="rk-body">
                  <div className="rk-name">
                    <b>{e.name}</b>
                    <span className="rk-it">{e.nameIt}</span>
                    {mine && <span className="rk-you">Il tuo punto</span>}
                  </div>
                  <div className="rk-cards">
                    {parseCards(e.example).map((c) => (
                      <MiniCard key={c} card={c} />
                    ))}
                  </div>
                  <p className="rk-text">{mine && current ? `${current.label}. ` : ""}{e.text}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
