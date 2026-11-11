/**
 * Tab Gioca: scelta del livello, tavolo, azioni, riepilogo di fine mano.
 * Nessun numero di strategia a schermo (come dal vivo): quello è compito di Allenamento.
 */
import { BOT_LEVEL_NAMES_IT, type BotLevel } from "../../bots";
import { legalActions } from "../../engine/holdem/engine";
import { Danny } from "../danny/Danny";
import { fmtChips, fmtSigned } from "../format";
import { HUMAN_SEAT, isHumanTurn, useGame } from "../store/game";
import { ActionBar } from "../table/ActionBar";
import { Table } from "../table/Table";
import "./gioca.css";

const LEVELS: BotLevel[] = ["easy", "medium", "hard", "expert"];

export function Gioca() {
  const g = useGame();

  if (!g.session) {
    return (
      <div className="screen gioca-lobby">
        <div className="gioca-hero">
          <Danny expression="contento" size={120} react="hop" />
          <div>
            <h1>Texas Hold'em</h1>
            <p className="muted">No-Limit cash game, tavolo da 6, blind 1/2, stack 200. Tu contro cinque bot.</p>
          </div>
        </div>
        <div className="panel">
          <div className="label">Livello dei bot</div>
          <div className="level-grid">
            {LEVELS.map((lv) => {
              const ready = lv === "easy" || lv === "medium";
              return (
                <button key={lv} className={`btn ${lv === "easy" ? "btn-primary" : ""}`} disabled={!ready} onClick={() => g.startSession(lv, g.playerName)}>
                  {BOT_LEVEL_NAMES_IT[lv]}
                  {!ready && <span className="label">Fase 3</span>}
                </button>
              );
            })}
          </div>
          <p className="muted small">Facile: avversari che chiamano troppo e non bluffano. Medio: tight-aggressive, rispettano le pot odds.</p>
        </div>
      </div>
    );
  }

  const { session, hand, seatMap } = g;
  const humanTurn = isHumanTurn(hand, seatMap);
  const human = session.players[HUMAN_SEAT]!;
  const over = g.phase === "hand_over";
  const humanIdx = seatMap.indexOf(HUMAN_SEAT);
  const res = hand?.results?.find((r) => r.seat === humanIdx);
  const legal = hand ? legalActions(hand) : null;
  const actingName = legal ? session.players[seatMap[legal.seat]!]!.name : null;

  return (
    <div className="screen gioca">
      <header className="gioca-top">
        <button className="btn btn-ghost gioca-exit" onClick={() => g.endSession()}>
          ✕
        </button>
        <div className="gioca-status">
          <span className="label">{BOT_LEVEL_NAMES_IT[g.level]} · mano {session.handCount}</span>
          <span className="mono">
            sessione <b className={g.sessionNet >= 0 ? "pos" : "neg"}>{fmtSigned(g.sessionNet)}</b>
          </span>
        </div>
        <label className="gioca-speed label">
          <input type="checkbox" checked={g.botDelay === 0} onChange={(e) => g.setBotDelay(e.target.checked ? 0 : 1)} /> veloce
        </label>
      </header>

      <Table session={session} hand={hand} seatMap={seatMap} showAllCards={false} />

      <div className="gioca-bottom">
        {over ? (
          <div className="panel hand-over">
            <div className="hand-over-row">
              <Danny expression={res && res.net > 0 ? "contento" : res && res.net < 0 ? "triste" : "neutro"} size={56} react="hop" />
              <div>
                <div className="hand-over-title">
                  {human.stack <= 0 ? "Hai finito le chip" : res && res.net > 0 ? `Hai vinto ${fmtChips(res.won)}` : res && res.net < 0 ? `Hai perso ${fmtChips(-res.net)}` : "Mano chiusa"}
                </div>
                {res?.description && <div className="muted">{res.description}</div>}
                {hand && <ShowdownSummary />}
              </div>
            </div>
            {human.stack <= 0 ? (
              <button className="btn btn-primary btn-block" onClick={() => g.rebuyHuman()}>
                Ricarica 200 e continua
              </button>
            ) : (
              <button className="btn btn-primary btn-block" onClick={() => g.deal()}>
                Prossima mano
              </button>
            )}
          </div>
        ) : humanTurn && hand ? (
          <ActionBar hand={hand} onAction={(a) => g.humanAction(a)} />
        ) : (
          <div className="gioca-waiting label">{actingName ? `${actingName} sta pensando…` : "…"}</div>
        )}
      </div>
    </div>
  );
}

/** Chi ha mostrato cosa allo showdown. */
function ShowdownSummary() {
  const { hand, seatMap, session } = useGame();
  if (!hand || !session) return null;
  const shows = hand.log.filter((e) => e.type === "showdown");
  if (shows.length === 0) return null;
  return (
    <ul className="showdown-list">
      {shows.map((e) => {
        if (e.type !== "showdown") return null;
        const p = session.players[seatMap[e.seat]!]!;
        const r = hand.results?.find((x) => x.seat === e.seat);
        return (
          <li key={e.seat} className={r && r.won > 0 ? "pos" : ""}>
            <b>{p.name}</b>: {e.description}
            {r && r.won > 0 && <span className="mono"> +{fmtChips(r.won)}</span>}
          </li>
        );
      })}
    </ul>
  );
}
