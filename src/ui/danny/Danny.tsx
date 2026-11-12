/**
 * Danny, la mascotte e il volto del coach.
 *
 * Forma "Tondo" del laboratorio Atypicam: cerchio nero, occhi bianchi a pillola, riflesso
 * in alto a sinistra, niente braccia né gambe. Disegnato in SVG dal codice.
 *
 * È vivo, come Beta di camstudy:
 * - gli occhi seguono il mouse o il dito ovunque sullo schermo (un solo listener per tutti i Danny);
 * - sbatte le palpebre ogni 3–7 s;
 * - se lo tocchi reagisce a caso (contento e salta, si arrabbia e trema, occhi a stella e balla…)
 *   per 1,6 s, poi torna com'era;
 * - ogni tanto, da solo, fa un saltello.
 * Tutto si ferma con "Riduci movimento" (prefers-reduced-motion).
 */
import { useEffect, useRef, useState } from "react";
import "./danny.css";

export type DannyExpression =
  | "neutro"
  | "contento"
  | "ridente"
  | "sorpreso"
  | "pensoso"
  | "scettico"
  | "perplesso"
  | "occhiolino"
  | "stellato"
  | "triste"
  | "arrabbiato"
  | "assonnato"
  | "ko";

export type DannyMove = "hop" | "wobble" | "shake" | "dance" | "squish" | "spin";

export interface DannyProps {
  expression?: DannyExpression;
  /** Dimensione in px (larghezza). */
  size?: number;
  /** Movimento da fare quando cambia `expression` (es. "hop" a fine mano vinta). */
  react?: DannyMove | null;
  /** Se false, il tocco non fa reagire Danny (es. dentro un pulsante). */
  interactive?: boolean;
  className?: string;
  title?: string;
}

const CX = 51, CY = 53, GAP = 16, S = 1.15, INK = "#fff";
const BODY = "#0e0e0e";

const pill = (x: number, y: number, w: number, h: number) =>
  `<rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="${Math.min(w / 2, h / 2)}" fill="${INK}"/>`;
const arc = (x1: number, y1: number, qx: number, qy: number, x2: number, y2: number, sw: number) =>
  `<path d="M${x1} ${y1}Q${qx} ${qy} ${x2} ${y2}" stroke="${INK}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`;

/** Un occhio. `side` = "l" o "r". Markup SVG come stringa (portato dal laboratorio). */
function eye(expr: DannyExpression, x: number, y: number, side: "l" | "r"): string {
  const s = S, w = 7 * s, h = 15 * s;
  const slant = (innerLow: boolean) => {
    const hw = w / 2, top = y - h / 2 + 2 * s, bot = y + h / 2, cut = h * 0.42;
    const inner = side === "l" ? 1 : -1, xi = x + hw * inner, xo = x - hw * inner;
    const ti = innerLow ? top + cut : top, to = innerLow ? top : top + cut;
    return `<path d="M${xo} ${to}L${xi} ${ti}L${xi} ${bot - hw}Q${xi} ${bot} ${x} ${bot}Q${xo} ${bot} ${xo} ${bot - hw}Z" fill="${INK}" stroke="${INK}" stroke-width="${1.2 * s}" stroke-linejoin="round"/>`;
  };
  switch (expr) {
    case "contento":
      return arc(x - w * 0.75, y + h * 0.15, x, y - h * 0.55, x + w * 0.75, y + h * 0.15, 3.6 * s);
    case "ridente":
      return arc(x - w * 0.9, y + h * 0.22, x, y - h * 0.75, x + w * 0.9, y + h * 0.22, 4.2 * s);
    case "sorpreso":
      return `<circle cx="${x}" cy="${y}" r="${w * 0.82}" fill="${INK}"/>`;
    case "pensoso":
      return side === "l" ? pill(x + 2 * s, y - 2 * s, w, h * 0.85) : pill(x + 2 * s, y - 2 * s, w, h * 0.65);
    case "scettico":
      if (side === "l") return pill(x, y, w, h) + arc(x - w * 0.9, y - h * 0.78, x, y - h * 1.12, x + w * 0.9, y - h * 0.68, 2.6 * s);
      return pill(x, y + h * 0.22, w, h * 0.52);
    case "perplesso":
      return side === "l" ? pill(x, y + 2 * s, w, h * 0.62) : pill(x, y, w, h);
    case "occhiolino":
      if (side === "r") return arc(x - w * 0.75, y + h * 0.05, x, y - h * 0.4, x + w * 0.75, y + h * 0.05, 3.4 * s);
      return pill(x, y, w, h);
    case "stellato": {
      const q = w * 1.2;
      return `<path d="M${x} ${y - q}Q${x} ${y} ${x + q} ${y}Q${x} ${y} ${x} ${y + q}Q${x} ${y} ${x - q} ${y}Q${x} ${y} ${x} ${y - q}Z" fill="${INK}"/>`;
    }
    case "triste":
      return slant(false);
    case "arrabbiato":
      return slant(true);
    case "assonnato":
      return `<rect x="${x - w * 0.8}" y="${y + h * 0.1}" width="${w * 1.6}" height="${3.4 * s}" rx="${1.7 * s}" fill="${INK}"/>`;
    case "ko": {
      const e = w * 0.7;
      return `<path d="M${x - e} ${y - e}L${x + e} ${y + e}M${x + e} ${y - e}L${x - e} ${y + e}" stroke="${INK}" stroke-width="${3 * s}" stroke-linecap="round"/>`;
    }
    default:
      return pill(x, y, w, h);
  }
}

/** Reazioni al tocco: coppie espressione + movimento, scelte a caso. */
const REACTIONS: Array<[DannyExpression, DannyMove]> = [
  ["contento", "hop"],
  ["ridente", "hop"],
  ["arrabbiato", "shake"],
  ["sorpreso", "squish"],
  ["stellato", "dance"],
  ["occhiolino", "wobble"],
  ["perplesso", "wobble"],
  ["ko", "spin"],
  ["scettico", "squish"],
  ["contento", "dance"],
];

const reduceMotion = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- sguardo condiviso: un listener per tutti i Danny montati ---------- */
const watchers = new Set<SVGGElement>();
let lookTimer: ReturnType<typeof setTimeout> | undefined;
let listening = false;

function lookAt(x: number, y: number) {
  for (const g of watchers) {
    const svg = g.ownerSVGElement;
    if (!svg) continue;
    const r = svg.getBoundingClientRect();
    if (!r.width) continue;
    const dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 220);
    // Spostamento in unità del viewBox (100), indipendente dalla dimensione di Danny.
    g.style.transform = `translate(${((dx / d) * 6 * k).toFixed(2)}px, ${((dy / d) * 4.5 * k).toFixed(2)}px)`;
  }
  clearTimeout(lookTimer);
  lookTimer = setTimeout(() => watchers.forEach((g) => (g.style.transform = "")), 2500);
}

function ensureListener() {
  if (listening || typeof window === "undefined" || reduceMotion()) return;
  listening = true;
  const onPointer = (e: PointerEvent) => lookAt(e.clientX, e.clientY);
  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("pointerdown", onPointer, { passive: true });
}

export function Danny({ expression = "neutro", size = 96, react = null, interactive = true, className = "", title = "Danny" }: DannyProps) {
  const [blink, setBlink] = useState(false);
  const [move, setMove] = useState<DannyMove | null>(react);
  const [override, setOverride] = useState<DannyExpression | null>(null);
  const eyesRef = useRef<SVGGElement>(null);
  const busy = useRef(false);

  // Sguardo
  useEffect(() => {
    const g = eyesRef.current;
    if (!g) return;
    ensureListener();
    watchers.add(g);
    return () => {
      watchers.delete(g);
    };
  }, []);

  // Palpebre e saltello spontaneo
  useEffect(() => {
    if (reduceMotion()) return;
    let alive = true;
    let blinkT: ReturnType<typeof setTimeout>, idleT: ReturnType<typeof setTimeout>;
    const blinkLoop = () => {
      blinkT = setTimeout(() => {
        if (!alive) return;
        setBlink(true);
        setTimeout(() => alive && setBlink(false), 180);
        blinkLoop();
      }, 3000 + Math.random() * 4000);
    };
    const idleLoop = () => {
      idleT = setTimeout(() => {
        if (!alive) return;
        if (!busy.current && Math.random() < 0.45) play(Math.random() < 0.7 ? "hop" : "wobble");
        idleLoop();
      }, 7000 + Math.random() * 9000);
    };
    blinkLoop();
    idleLoop();
    return () => {
      alive = false;
      clearTimeout(blinkT);
      clearTimeout(idleT);
    };
  }, []);

  // Movimento richiesto dal genitore quando cambia l'espressione (es. fine mano)
  useEffect(() => {
    if (react) play(react);
  }, [react, expression]);

  function play(m: DannyMove) {
    if (reduceMotion()) return;
    setMove(null);
    requestAnimationFrame(() => setMove(m));
    setTimeout(() => setMove((cur) => (cur === m ? null : cur)), 1100);
  }

  function onTap() {
    if (!interactive || busy.current) return;
    busy.current = true;
    const [e, m] = REACTIONS[Math.floor(Math.random() * REACTIONS.length)]!;
    setOverride(e);
    play(m);
    setTimeout(() => {
      setOverride(null);
      busy.current = false;
    }, 1600);
  }

  const shown = override ?? expression;
  const eyes = eye(shown, CX - GAP / 2, CY, "l") + eye(shown, CX + GAP / 2, CY, "r");
  const cls = ["danny", move ? `danny-${move}` : "", blink ? "danny-blink" : "", interactive ? "danny-tap" : "", className].filter(Boolean).join(" ");

  return (
    <svg className={cls} viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={title} onPointerDown={interactive ? onTap : undefined}>
      <g className="danny-body">
        <circle cx="50" cy="50" r="40" fill={BODY} />
        <ellipse cx="32" cy="27" rx="9" ry="5" fill="#fff" opacity="0.22" transform="rotate(-35 32 27)" />
        <g className="danny-eyes" ref={eyesRef}>
          <g className="danny-lids" dangerouslySetInnerHTML={{ __html: eyes }} />
        </g>
      </g>
    </svg>
  );
}
