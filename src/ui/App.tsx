/**
 * Shell dell'app: tab bar (Gioca, Allenamento, Lezioni, Progressi) e routing minimo via hash,
 * così il link #/progressi funziona anche offline e nella PWA senza router esterno.
 */
import { useEffect, useState } from "react";
import { Danny } from "./danny/Danny";
import { Gioca } from "./screens/Gioca";
import { Progressi } from "./screens/Progressi";
import { useGame } from "./store/game";
import "./app.css";

type Tab = "gioca" | "allenamento" | "lezioni" | "progressi";

const TABS: Array<{ id: Tab; label: string; icon: string }> = [
  { id: "gioca", label: "Gioca", icon: "♠" },
  { id: "allenamento", label: "Allenamento", icon: "◎" },
  { id: "lezioni", label: "Lezioni", icon: "▤" },
  { id: "progressi", label: "Progressi", icon: "↗" },
];

function tabFromHash(): Tab {
  const h = location.hash.replace(/^#\/?/, "") as Tab;
  return TABS.some((t) => t.id === h) ? h : "gioca";
}

export function App() {
  const [tab, setTab] = useState<Tab>(tabFromHash);
  const inGame = useGame((s) => s.session !== null && s.phase === "playing");

  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = (t: Tab) => {
    location.hash = `/${t}`;
  };

  return (
    <div className="app">
      <main className="app-main">
        {tab === "gioca" && <Gioca />}
        {tab === "allenamento" && <ComingSoon title="Allenamento" phase="Fase 2" text="Partite assistite con le card di Danny (outs, equity, pot odds) e drill a tempo." />}
        {tab === "lezioni" && <ComingSoon title="Lezioni" phase="Fase 2" text="Regole, hand ranking, posizione, starting hands, outs e pot odds. Ogni lezione finisce con un esercizio." />}
        {tab === "progressi" && <Progressi />}
      </main>
      <nav className={`tabbar ${inGame && tab === "gioca" ? "tabbar-quiet" : ""}`} aria-label="Sezioni">
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? "tab-active" : ""}`} onClick={() => go(t.id)} aria-current={tab === t.id ? "page" : undefined}>
            <span className="tab-icon" aria-hidden="true">
              {t.icon}
            </span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function ComingSoon({ title, phase, text }: { title: string; phase: string; text: string }) {
  return (
    <div className="screen">
      <div className="gioca-hero">
        <Danny expression="pensoso" size={88} />
        <div>
          <h1>{title}</h1>
          <p className="muted">
            <span className="badge">{phase}</span> {text}
          </p>
        </div>
      </div>
    </div>
  );
}
