/**
 * Barra delle azioni dell'utente: Fold / Check o Call / Bet o Raise con slider e scorciatoie.
 * Pulsanti alti ≥ 48 px, a tutta larghezza su iPhone.
 */
import { useEffect, useState } from "react";
import { legalActions, potSize } from "../../engine/holdem/engine";
import type { Action, HandState } from "../../engine/holdem/types";
import { fmtChips } from "../format";
import "./actionbar.css";

export interface ActionBarProps {
  hand: HandState;
  onAction(action: Action): void;
}

export function ActionBar({ hand, onAction }: ActionBarProps) {
  const legal = legalActions(hand);
  const [amount, setAmount] = useState(0);
  const [showSlider, setShowSlider] = useState(false);

  useEffect(() => {
    if (legal?.raise) setAmount(legal.raise.min);
    setShowSlider(false);
  }, [hand, legal?.raise?.min]);

  if (!legal) return null;
  const me = hand.seats[legal.seat]!;
  const pot = potSize(hand);
  const raise = legal.raise;
  const bb = hand.config.bigBlind;

  const quick = (label: string, total: number) => {
    if (!raise) return null;
    const v = Math.max(raise.min, Math.min(raise.max, Math.round(total)));
    return (
      <button key={label} className="btn btn-ghost ab-quick" onClick={() => setAmount(v)}>
        {label}
      </button>
    );
  };

  return (
    <div className="actionbar">
      {showSlider && raise && (
        <div className="ab-slider panel">
          <div className="ab-slider-head">
            <span className="label">{raise.isBet ? "punta" : "rilancia a"}</span>
            <span className="mono ab-amount">{fmtChips(amount)}</span>
            <span className="muted mono">{(amount / bb).toLocaleString("it-IT", { maximumFractionDigits: 1 })} bb</span>
          </div>
          <input type="range" min={raise.min} max={raise.max} step={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="ab-range" />
          <div className="ab-quicks">
            {quick("min", raise.min)}
            {quick("½ piatto", me.streetBet + legal.callAmount + (pot + legal.callAmount) * 0.5)}
            {quick("¾ piatto", me.streetBet + legal.callAmount + (pot + legal.callAmount) * 0.75)}
            {quick("piatto", me.streetBet + legal.callAmount + (pot + legal.callAmount))}
            {quick("all-in", raise.max)}
          </div>
          <button className="btn btn-primary btn-block" onClick={() => onAction({ type: raise.isBet ? "bet" : "raise", amount })}>
            {raise.isBet ? "Punta" : "Rilancia a"} {fmtChips(amount)}
          </button>
        </div>
      )}
      <div className="ab-row">
        <button className="btn ab-fold" disabled={!legal.canFold} onClick={() => onAction({ type: "fold" })}>
          Fold
        </button>
        {legal.canCheck ? (
          <button className="btn btn-paper" onClick={() => onAction({ type: "check" })}>
            Check
          </button>
        ) : (
          <button className="btn btn-paper" onClick={() => onAction({ type: "call" })}>
            Call {fmtChips(legal.callAmount)}
            {legal.callIsAllIn && <span className="label">all-in</span>}
          </button>
        )}
        <button className="btn btn-primary" disabled={!raise} onClick={() => setShowSlider((v) => !v)}>
          {raise?.isBet ? "Bet" : "Raise"}
        </button>
      </div>
    </div>
  );
}
