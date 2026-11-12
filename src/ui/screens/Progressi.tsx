/**
 * Tab Progressi: riepilogo delle mani giocate, stato della sincronizzazione, impostazioni
 * (token GitHub, nome, velocità). Statistiche vere (VPIP, PFR…) arrivano in Fase 3.
 */
import { BOT_LEVEL_NAMES_IT, type BotLevel } from "../../bots";
import { useEffect, useState } from "react";
import { checkToken } from "../../progress/github";
import { deviceId, getToken, loadLocal, setToken, wipeLocal } from "../../progress/local";
import { pull, push, useSyncStore } from "../../progress/sync";
import type { ProgressData } from "../../progress/types";
import { Danny } from "../danny/Danny";
import { fmtChips, fmtSigned } from "../format";
import "./progressi.css";

const STATUS_IT: Record<string, string> = {
  "no-token": "Nessun token: i progressi restano solo su questo dispositivo",
  idle: "Pronto",
  syncing: "Sincronizzazione in corso…",
  ok: "Sincronizzato",
  offline: "Offline: le modifiche partiranno quando torna la rete",
  error: "Errore",
};

export function Progressi() {
  const sync = useSyncStore();
  const [data, setData] = useState<ProgressData | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [tokenMsg, setTokenMsg] = useState<string | null>(null);
  const hasToken = !!getToken();

  const reload = () => void loadLocal().then(setData);
  useEffect(reload, [sync.lastSync, sync.status]);

  const saveToken = async () => {
    const t = tokenInput.trim();
    if (!t) return;
    setTokenMsg("Verifico…");
    const r = await checkToken(t);
    if (!r.ok) {
      setTokenMsg(r.reason);
      return;
    }
    setToken(t);
    setTokenInput("");
    setTokenMsg("Token salvato su questo dispositivo.");
    await pull();
    await push();
  };

  const hands = data?.hands ?? [];
  const holdem = hands.filter((h) => h.game === "holdem");
  const net = holdem.reduce((a, h) => a + h.net, 0);
  const bb = holdem.length ? (net / holdem.length) * 100 / (holdem[0]!.bigBlind || 2) : 0;
  const byLevel = Object.entries(
    holdem.reduce<Record<string, { n: number; net: number }>>((acc, h) => {
      const l = (acc[h.level] ??= { n: 0, net: 0 });
      l.n++;
      l.net += h.net;
      return acc;
    }, {}),
  );

  return (
    <div className="screen screen-scroll progressi">
      <div className="page-hero">
        <Danny expression={holdem.length ? "pensoso" : "neutro"} size={88} />
        <div>
          <h1>Progress</h1>
          <p className="muted">Mani, risultati e sincronizzazione.</p>
        </div>
      </div>

      <section className="panel">
        <h3 className="section-title">Hold'em</h3>
        <div className="stat-grid">
          <Stat label="mani giocate" value={fmtChips(holdem.length)} />
          <Stat label="risultato" value={fmtSigned(net)} tone={net >= 0 ? "pos" : "neg"} />
          <Stat label="bb/100" value={holdem.length ? bb.toLocaleString("it-IT", { maximumFractionDigits: 1 }) : "–"} />
        </div>
        {byLevel.length > 0 && (
          <ul className="plain-list">
            {byLevel.map(([level, v]) => (
              <li key={level}>
                <span className="muted">{BOT_LEVEL_NAMES_IT[level as BotLevel] ?? level}</span>: {fmtChips(v.n)} {v.n === 1 ? "mano" : "mani"}, <span className={v.net >= 0 ? "pos" : "neg"}>{fmtSigned(v.net)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="muted small">Statistiche vere (VPIP, PFR, errori più frequenti, ripasso) arrivano con le Fasi 2 e 3.</p>
      </section>

      <section className="panel">
        <h3 className="section-title">Sincronizzazione</h3>
        <p>
          <b className={`sync-${sync.status}`}>{STATUS_IT[sync.status]}</b>
          {sync.lastError && <span className="neg"> — {sync.lastError}</span>}
        </p>
        <p className="muted small">
          Dispositivo <span className="code">{deviceId()}</span>
          {sync.lastSync && <> · ultima sync {new Date(sync.lastSync).toLocaleString("it-IT")}</>}
          {sync.remoteDevices > 0 && <> · {sync.remoteDevices} dispositivi nel repo</>}
          {sync.pendingPush && <> · modifiche da inviare</>}
        </p>
        {hasToken && (
          <div className="row">
            <button className="btn btn-ghost" onClick={() => void pull()} disabled={sync.status === "syncing"}>
              Scarica
            </button>
            <button className="btn btn-ghost" onClick={() => void push()} disabled={sync.status === "syncing"}>
              Invia ora
            </button>
          </div>
        )}
      </section>

      <section className="panel">
        <h3 className="section-title">Token GitHub</h3>
        <p className="muted small">
          Token fine-grained con permesso <span className="code">Contents: read/write</span> solo sul repo <span className="code">whimsicam/cams-eleven</span>. Resta nel localStorage di questo
          dispositivo, mai nel codice né nel repo. Da reinserire alla scadenza.
        </p>
        <div className="row">
          <input className="input" type="password" placeholder={hasToken ? "Token salvato · incolla per sostituirlo" : "github_pat_…"} value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} autoComplete="off" />
          <button className="btn btn-primary" onClick={() => void saveToken()} disabled={!tokenInput.trim()}>
            Salva
          </button>
        </div>
        {tokenMsg && <p className="small">{tokenMsg}</p>}
        {hasToken && (
          <button
            className="btn btn-ghost small"
            onClick={() => {
              setToken(null);
              useSyncStore.setState({ status: "no-token" });
              setTokenMsg("Token rimosso.");
            }}
          >
            Rimuovi token
          </button>
        )}
      </section>

      <section className="panel">
        <h3 className="section-title">Questo dispositivo</h3>
        <button
          className="btn btn-ghost"
          onClick={() => {
            if (confirm("Cancellare mani e impostazioni salvate su questo dispositivo? Quelle già inviate al repo restano.")) void wipeLocal().then(reload);
          }}
        >
          Azzera dati locali
        </button>
      </section>
    </div>
  );
}

function Stat({ label, value, tone = "" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="stat">
      <div className={`stat-value ${tone}`}>{value}</div>
      <div className="label">{label}</div>
    </div>
  );
}
