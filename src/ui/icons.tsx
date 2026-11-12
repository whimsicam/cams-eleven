/**
 * Icone della tab bar, disegnate in SVG (niente caratteri Unicode al posto delle icone).
 * Stesso tratto (1,8) e stessa griglia 24×24 per tutte; la versione attiva è piena.
 */
export type TabIconName = "play" | "training" | "lessons" | "progress";

export function TabIcon({ name, active }: { name: TabIconName; active: boolean }) {
  const fill = active ? "currentColor" : "none";
  return (
    <svg className="tab-icon" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {name === "play" && (
        <>
          {/* Due carte sovrapposte */}
          <rect x="3.5" y="5" width="10" height="14" rx="2" transform="rotate(-10 8.5 12)" />
          <rect x="10" y="4.5" width="10" height="14" rx="2" transform="rotate(8 15 11.5)" fill={active ? "currentColor" : "var(--green-950)"} />
        </>
      )}
      {name === "training" && (
        <>
          {/* Bersaglio */}
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="12" cy="12" r="4.5" />
          <circle cx="12" cy="12" r="1.2" fill="currentColor" />
          {active && <circle cx="12" cy="12" r="4.5" fill="currentColor" opacity="0.35" />}
        </>
      )}
      {name === "lessons" && (
        <>
          {/* Libro aperto */}
          <path d="M3 5.5c2.8-1 5.8-.8 9 1 3.2-1.8 6.2-2 9-1V19c-2.8-1-5.8-.8-9 1-3.2-1.8-6.2-2-9-1z" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.35 : 0} />
          <path d="M12 6.5V20" />
        </>
      )}
      {name === "progress" && (
        <>
          {/* Barre crescenti */}
          <rect x="4" y="13" width="4" height="7" rx="1" fill={fill} />
          <rect x="10" y="9" width="4" height="11" rx="1" fill={fill} />
          <rect x="16" y="4" width="4" height="16" rx="1" fill={fill} />
        </>
      )}
    </svg>
  );
}
