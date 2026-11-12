/**
 * Azioni dell'utente.
 * - Riga principale: Fold · Check/Call · Bet/Raise, tre colonne uguali.
 * - Bet/Raise apre il pannello della puntata AL POSTO della riga (non sopra la tab bar):
 *   importo, slider, cinque scorciatoie in una griglia di colonne uguali, Annulla e Conferma.
 */
import { useEffect, useState } from "react";
import { legalActions, potSize } from "../../engine/holdem/engine";
import type { Action, HandState } from "../../engine/holdem/types";
import { fmtChips, fmtDec } from "../format";
import "./actionbar.css";

export interface ActionBarProps {
  hand: HandState;
  onAction(action: Action): void;
}

export function ActionBar({ hand, onAction }: ActionBarProps) {
  const legal = legalActions(hand);
  const [amount, setAmount] = useState(0);
  const [sizing, setSizing] = useState(false);

  useEffect(() => {
    if (legal?.raise) setAmount(legal.raise.min);
    setSizing(false);
  }, [hand, legal?.raise?.min]);

  if (!legal) return null;
  const me = hand.seats[legal.seat]!;
  const pot = potSize(hand);
  const raise = legal.raise;
  const bb = hand.config.bigBlind;

  if (sizing && raise) {
    // Importo "a" (totale della puntata nel giro) per una frazione del piatto dopo il call.
    const toPot = (f: number) => me.streetBet + legal.callAmount + (pot + legal.callAmount) * f;
    const quicks: Array<[string, number]> = [
      ["Min", raise.min],
      ["½ pot", toPot(0.5)],
      ["¾ pot", toPot(0.75)],
      ["Pot", toPot(1)],
      ["All-in", raise.max],
    ];
    const clamp = (v: number) => Math.max(raise.min, Math.min(raise.max, Math.round(v)));
    return (
      <div className="ab-sizing">
        <div className="ab-amount-row">
          <span className="ab-amount-label">{raise.isBet ? "Bet" : "Raise to"}</span>
          <b className="ab-amount num">{fmtChips(amount)}</b>
          <span className="ab-amount-bb num">{fmtDec(amount / bb)} bb</span>
        </div>
        <input
          type="range"
          className="ab-range"
          min={raise.min}
          max={raise.max}
          step={1}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          aria-label="Importo della puntata"
        />
        <div className="ab-quicks">
          {quicks.map(([label, v]) => {
            const val = clamp(v);
            return (
              <button key={label} className={`btn ab-quick ${amount === val ? "ab-quick-on" : ""}`} onClick={() => setAmount(val)}>
                {label}
              </button>
            );
          })}
        </div>
        <div className="ab-confirm">
          <button className="btn btn-ghost" onClick={() => setSizing(false)}>
            Annulla
          </button>
          <button className="btn btn-primary" onClick={() => onAction({ type: raise.isBet ? "bet" : "raise", amount })}>
            {raise.isBet ? "Bet" : "Raise to"} {fmtChips(amount)}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ab-row">
      <button className="btn ab-btn ab-fold" disabled={!legal.canFold} onClick={() => onAction({ type: "fold" })}>
        Fold
      </button>
      {legal.canCheck ? (
        <button className="btn ab-btn btn-paper" onClick={() => onAction({ type: "check" })}>
          Check
        </button>
      ) : (
        <button className="btn ab-btn btn-paper" onClick={() => onAction({ type: "call" })}>
          Call <span className="num">{fmtChips(legal.callAmount)}</span>
          {legal.callIsAllIn && <small>all-in</small>}
        </button>
      )}
      <button className="btn ab-btn btn-primary" disabled={!raise} onClick={() => setSizing(true)}>
        {raise?.isBet ? "Bet" : "Raise"}
      </button>
    </div>
  );
}
