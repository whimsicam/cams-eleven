/**
 * Tab Play: scelta del livello, poi la partita.
 *
 * Layout della partita (colonna alta come lo schermo, niente scroll):
 *   barra in alto  · uscita, livello e mano, risultato della sessione, Danny, classifica dei punti
 *   tavolo         · prende tutto lo spazio che resta
 *   la tua mano    · carte grandi, stack, posizione, il tuo punto attuale (tocca → classifica)
 *   azioni         · Fold / Call / Raise, oppure il pannello della puntata, oppure il fine mano
 * Nessun numero di strategia (come dal vivo): quello è compito di Training.
 */
import { useMemo, useState } from "react";
import { BOT_LEVEL_NAMES_IT, type BotLevel } from "../../bots";
import { currentHand } from "../../engine/cards/handRankings";
import { legalActions, positionName } from "../../engine/holdem/engine";
import { Danny, type DannyExpression, type DannyMove } from "../danny/Danny";
import { fmtChips, fmtSigned } from "../format";
import { HandRankings } from "../rankings/HandRankings";
import { HUMAN_SEAT, isHumanTurn, useGame } from "../store/game";
import { PlayingCard } from "../cards/PlayingCard";
import { ActionBar } from "../table/ActionBar";
import { Table } from "../table/Table";
import "./gioca.css";

const LEVELS: Array<{ id: BotLevel; text: string; ready: boolean }> = [
  { id: "easy", text: "Chiamano troppo, non bluffano.", ready: true },
  { id: "medium", text: "Tight-aggressive, rispettano le pot odds.", ready: true },
  { id: "hard", text: "Ragionano per range.", ready: false },
  { id: "expert", text: "Ti studiano e si adattano.", ready: false },
];

function RankingsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4 5.5l1-.8V8M3.6 11.2c.3-.5 1.9-.6 1.9.4 0 .8-1.9 1.3-1.9 2.4h2M3.7 16.4c.6-.5 1.8-.4 1.8.4 0 .5-.5.7-1 .7.6 0 1.1.3 1.1.9 0 .9-1.4 1-2 .4" strokeWidth="1.3" />
    </svg>
  );
}

export function Gioca() {
  const g = useGame();
  const [rankingsOpen, setRankingsOpen] = useState(false);

  const { session, hand, seatMap } = g;
  const humanIdx = seatMap.indexOf(HUMAN_SEAT);
  const heroState = hand && humanIdx >= 0 ? hand.seats[humanIdx] : undefined;
  const myHand = useMemo(() => {
    if (!heroState || heroState.holeCards.length === 0 || !hand) return null;
    return currentHand([...heroState.holeCards, ...hand.board]);
  }, [heroState, hand]);

  const rankings = <HandRankings open={rankingsOpen} onClose={() => setRankingsOpen(false)} current={heroState?.folded ? null : myHand} />;

  if (!session) {
    return (
      <div className="screen screen-scroll lobby">
        <div className="lobby-hero">
          <Danny expression="contento" size={112} react="hop" />
          <div>
            <h1>Texas Hold'em</h1>
            <p className="muted">No-Limit cash game, 6 al tavolo, blind 1/2, stack 200. Tu contro cinque bot.</p>
          </div>
        </div>
        <h2 className="lobby-title">Scegli gli avversari</h2>
        <div className="level-grid">
          {LEVELS.map((lv) => (
            <button key={lv.id} className={`level ${lv.id === "easy" ? "level-first" : ""}`} disabled={!lv.ready} onClick={() => g.startSession(lv.id, g.playerName)}>
              <span className="level-name">{BOT_LEVEL_NAMES_IT[lv.id]}</span>
              <span className="level-text">{lv.ready ? lv.text : "Arriva nella Fase 3"}</span>
            </button>
          ))}
        </div>
        <div className="lobby-options">
          <label className="toggle">
            <input type="checkbox" checked={g.botDelay === 0} onChange={(e) => g.setBotDelay(e.target.checked ? 0 : 1)} />
            <span>Bot veloci</span>
          </label>
          <button className="btn btn-ghost" onClick={() => setRankingsOpen(true)}>
            <RankingsIcon /> Hand rankings
          </button>
        </div>
        {rankings}
      </div>
    );
  }

  const humanTurn = isHumanTurn(hand, seatMap);
  const human = session.players[HUMAN_SEAT]!;
  const over = g.phase === "hand_over";
  const res = hand?.results?.find((r) => r.seat === humanIdx);
  const legal = hand ? legalActions(hand) : null;
  const actingName = legal ? session.players[seatMap[legal.seat]!]!.name : null;

  // Umore di Danny: segue la mano.
  let mood: DannyExpression = "neutro";
  let move: DannyMove | null = null;
  if (over && res) {
    if (res.net > 0) [mood, move] = res.won >= 40 ? ["stellato", "dance"] : ["contento", "hop"];
    else if (res.net < 0) [mood, move] = heroState?.folded ? ["neutro", null] : ["triste", "wobble"];
  } else if (humanTurn) mood = "pensoso";

  const myPos = hand && humanIdx >= 0 ? positionName(humanIdx, hand.button, hand.seats.length) : null;

  return (
    <div className="game">
      <header className="game-top">
        <button className="btn btn-quiet btn-icon" onClick={() => g.endSession()} aria-label="Esci dal tavolo">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <div className="game-status">
          <span className="game-status-1">
            {BOT_LEVEL_NAMES_IT[g.level]} · mano {session.handCount}
          </span>
          <span className="game-status-2">
            Sessione <b className={`num ${g.sessionNet > 0 ? "pos" : g.sessionNet < 0 ? "neg" : ""}`}>{fmtSigned(g.sessionNet)}</b>
          </span>
        </div>
        <span className="danny-halo">
          <Danny expression={mood} react={move} size={38} />
        </span>
        <button className="btn btn-ghost game-rk" onClick={() => setRankingsOpen(true)} aria-label="Classifica dei punti">
          <RankingsIcon />
          <span>Punti</span>
        </button>
      </header>

      <div className="game-table">
        <Table session={session} hand={hand} seatMap={seatMap} showAllCards={false} />
      </div>

      <section className={`hero ${humanTurn ? "hero-turn" : ""} ${heroState?.folded ? "hero-folded" : ""}`} aria-label="La tua mano">
        <div className="hero-cards">
          {heroState?.holeCards.map((c, i) => (
            <PlayingCard key={`${hand?.handId}-${i}`} card={c} width={68} className="pcard-deal" highlight={!!res && res.won > 0} style={{ animationDelay: `${i * 90}ms` }} />
          ))}
        </div>
        <div className="hero-info">
          <div className="hero-name">
            {human.name}
            {myPos && <span className="hero-pos">{myPos}</span>}
            {hand && hand.button === humanIdx && <span className="dealer-btn dealer-inline">D</span>}
          </div>
          <div className="hero-stack num">{heroState?.allIn ? "All-in" : fmtChips(heroState?.stack ?? human.stack)}</div>
          {heroState && heroState.streetBet > 0 && !over && (
            <div className="hero-bet num">
              <span className="chip" aria-hidden="true" /> {fmtChips(heroState.streetBet)}
            </div>
          )}
          {myHand && !heroState?.folded && (
            <button className="hero-hand" onClick={() => setRankingsOpen(true)}>
              {myHand.label}
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <circle cx="8" cy="8" r="6.5" />
                <path d="M8 7.2v4M8 4.8v.1" />
              </svg>
            </button>
          )}
        </div>
      </section>

      <div className="game-actions">
        {over ? (
          <HandOver net={res?.net ?? 0} won={res?.won ?? 0} description={res?.description} broke={human.stack <= 0} onNext={() => g.deal()} onRebuy={() => g.rebuyHuman()} />
        ) : humanTurn && hand ? (
          <ActionBar hand={hand} onAction={(a) => g.humanAction(a)} />
        ) : (
          <div className="game-waiting" aria-live="polite">
            {actingName ? `${actingName} sta pensando…` : ""}
          </div>
        )}
      </div>
      {rankings}
    </div>
  );
}

function HandOver({ net, won, description, broke, onNext, onRebuy }: { net: number; won: number; description?: string; broke: boolean; onNext(): void; onRebuy(): void }) {
  const title = broke ? "Hai finito le chip" : net > 0 ? `Hai vinto ${fmtChips(won)}` : net < 0 ? `Hai perso ${fmtChips(-net)}` : "Mano chiusa";
  return (
    <div className="hand-over">
      <div className="hand-over-text">
        <b className={net > 0 ? "pos" : net < 0 ? "neg" : ""}>{title}</b>
        <ShowdownSummary fallback={description} />
      </div>
      {broke ? (
        <button className="btn btn-primary btn-block hand-over-btn" onClick={onRebuy}>
          Ricarica 200 e continua
        </button>
      ) : (
        <button className="btn btn-primary btn-block hand-over-btn" onClick={onNext}>
          Prossima mano
        </button>
      )}
    </div>
  );
}

/** Chi ha mostrato cosa allo showdown (o il tuo punto, se nessuno ha mostrato). */
function ShowdownSummary({ fallback }: { fallback?: string }) {
  const { hand, seatMap, session } = useGame();
  if (!hand || !session) return null;
  const shows = hand.log.filter((e) => e.type === "showdown");
  if (shows.length === 0) return fallback ? <span className="muted">{fallback}</span> : <span className="muted">Gli altri hanno foldato.</span>;
  return (
    <ul className="showdown-list">
      {shows.map((e) => {
        if (e.type !== "showdown") return null;
        const p = session.players[seatMap[e.seat]!]!;
        const r = hand.results?.find((x) => x.seat === e.seat);
        return (
          <li key={e.seat} className={r && r.won > 0 ? "sd-win" : ""}>
            <span className="sd-name">{p.name}</span> {e.description}
            {r && r.won > 0 && <b className="num"> +{fmtChips(r.won)}</b>}
          </li>
        );
      })}
    </ul>
  );
}
