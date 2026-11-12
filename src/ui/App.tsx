/**
 * Shell dell'app: contenuto + tab bar (Play, Training, Lessons, Progress).
 *
 * Layout a griglia alta esattamente quanto lo schermo: la tab bar è una riga della griglia,
 * non un elemento `position: fixed`, così su iPhone resta sempre in fondo e non si sposta
 * con lo scroll o con la barra di Safari. Su schermi larghi diventa una barra laterale.
 * Routing minimo via hash (#/progress), che funziona offline e nella PWA.
 */
import { useEffect, useState } from "react";
import { Danny } from "./danny/Danny";
import { Gioca } from "./screens/Gioca";
import { Progressi } from "./screens/Progressi";
import { TabIcon, type TabIconName } from "./icons";
import "./app.css";

type Tab = "play" | "training" | "lessons" | "progress";

const TABS: Array<{ id: Tab; label: string; icon: TabIconName }> = [
  { id: "play", label: "Play", icon: "play" },
  { id: "training", label: "Training", icon: "training" },
  { id: "lessons", label: "Lessons", icon: "lessons" },
  { id: "progress", label: "Progress", icon: "progress" },
];

/** Accetta anche i vecchi hash italiani, così un segnalibro salvato continua a funzionare. */
const LEGACY: Record<string, Tab> = { gioca: "play", allenamento: "training", lezioni: "lessons", progressi: "progress" };

function tabFromHash(): Tab {
  const h = location.hash.replace(/^#\/?/, "");
  if (TABS.some((t) => t.id === h)) return h as Tab;
  return LEGACY[h] ?? "play";
}

export function App() {
  const [tab, setTab] = useState<Tab>(tabFromHash);

  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return (
    <div className="app">
      <main className={`app-main app-main-${tab}`}>
        {tab === "play" && <Gioca />}
        {tab === "training" && (
          <ComingSoon title="Training" text="Partite assistite in cui Danny ti dice cosa fare (outs, equity, pot odds) e drill a tempo." />
        )}
        {tab === "lessons" && (
          <ComingSoon title="Lessons" text="Regole, classifica dei punti, posizione, mani di partenza, outs e pot odds. Ogni lezione finisce con un esercizio." />
        )}
        {tab === "progress" && <Progressi />}
      </main>
      <nav className="tabbar" aria-label="Sezioni">
        {TABS.map((t) => (
          <a key={t.id} href={`#/${t.id}`} className={`tab ${tab === t.id ? "tab-active" : ""}`} aria-current={tab === t.id ? "page" : undefined}>
            <TabIcon name={t.icon} active={tab === t.id} />
            <span className="tab-label">{t.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}

function ComingSoon({ title, text }: { title: string; text: string }) {
  return (
    <div className="screen screen-scroll">
      <div className="soon">
        <Danny expression="pensoso" size={96} />
        <h1>{title}</h1>
        <p className="muted">{text}</p>
        <span className="badge">Arriva nella Fase 2</span>
      </div>
    </div>
  );
}
