/**
 * Danny, la mascotte e il volto del coach.
 *
 * È la forma "Tondo" del laboratorio Atypicam: cerchio nero, occhi bianchi a pillola,
 * riflesso in alto a sinistra, senza braccia né gambe. Disegnato in SVG dal codice
 * (nessuna immagine), così cambia espressione e si anima.
 *
 * Espressioni usate dal coach (vedi SPEC.md §5): neutro, pensoso, scettico, contento,
 * sorpreso, occhiolino, ridente, stellato, triste, ko.
 */
import { useEffect, useState } from "react";
import "./danny.css";

export type DannyExpression =
  | "neutro"
  | "contento"
  | "ridente"
  | "sorpreso"
  | "pensoso"
  | "scettico"
  | "occhiolino"
  | "stellato"
  | "triste"
  | "ko";

export interface DannyProps {
  expression?: DannyExpression;
  /** Dimensione in px (larghezza). */
  size?: number;
  /** Animazione d'ingresso o reazione: "hop", "wobble", null. */
  react?: "hop" | "wobble" | null;
  /** Sbatte le palpebre a intervalli casuali. */
  idle?: boolean;
  className?: string;
  title?: string;
}

const CX = 51, CY = 52, GAP = 16, S = 1.15, INK = "#fff";
const BODY = "#0e0e0e";

function pill(x: number, y: number, w: number, h: number): string {
  return `<rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="${Math.min(w / 2, h / 2)}" fill="${INK}"/>`;
}
function arc(x1: number, y1: number, qx: number, qy: number, x2: number, y2: number, sw: number): string {
  return `<path d="M${x1} ${y1}Q${qx} ${qy} ${x2} ${y2}" stroke="${INK}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`;
}

/** Un occhio. `side` = "l" o "r". Ritorna markup SVG (stringa, per semplicità di porting dal laboratorio). */
function eye(expr: DannyExpression, x: number, y: number, side: "l" | "r"): string {
  const s = S, w = 7 * s, h = 15 * s;
  switch (expr) {
    case "contento":
      return arc(x - w * 0.75, y + h * 0.15, x, y - h * 0.55, x + w * 0.75, y + h * 0.15, 3.6 * s);
    case "ridente":
      return arc(x - w * 0.9, y + h * 0.22, x, y - h * 0.75, x + w * 0.9, y + h * 0.22, 4.2 * s);
    case "sorpreso":
      return `<circle cx="${x}" cy="${y}" r="${w * 0.82}" fill="${INK}"/>`;
    case "pensoso":
      // Occhi che guardano in alto a destra, uno leggermente più chiuso.
      return side === "l" ? pill(x + 2 * s, y - 2 * s, w, h * 0.85) : pill(x + 2 * s, y - 2 * s, w, h * 0.65);
    case "scettico":
      if (side === "l") return pill(x, y, w, h) + arc(x - w * 0.9, y - h * 0.78, x, y - h * 1.12, x + w * 0.9, y - h * 0.68, 2.6 * s);
      return pill(x, y + h * 0.22, w, h * 0.52);
    case "occhiolino":
      if (side === "r") return arc(x - w * 0.75, y + h * 0.05, x, y - h * 0.4, x + w * 0.75, y + h * 0.05, 3.4 * s);
      return pill(x, y, w, h);
    case "stellato": {
      const q = w * 1.2;
      return `<path d="M${x} ${y - q}Q${x} ${y} ${x + q} ${y}Q${x} ${y} ${x} ${y + q}Q${x} ${y} ${x - q} ${y}Q${x} ${y} ${x} ${y - q}Z" fill="${INK}"/>`;
    }
    case "triste": {
      // Palpebra inclinata verso l'esterno.
      const hw = w / 2, top = y - h / 2 + 2 * s, bot = y + h / 2, cut = h * 0.42;
      const inner = side === "l" ? 1 : -1, xi = x + hw * inner, xo = x - hw * inner;
      return `<path d="M${xo} ${top + cut}L${xi} ${top}L${xi} ${bot - hw}Q${xi} ${bot} ${x} ${bot}Q${xo} ${bot} ${xo} ${bot - hw}Z" fill="${INK}" stroke="${INK}" stroke-width="${1.2 * s}" stroke-linejoin="round"/>`;
    }
    case "ko": {
      const e = w * 0.7;
      return `<path d="M${x - e} ${y - e}L${x + e} ${y + e}M${x + e} ${y - e}L${x - e} ${y + e}" stroke="${INK}" stroke-width="${3 * s}" stroke-linecap="round"/>`;
    }
    default:
      return pill(x, y, w, h);
  }
}

export function Danny({ expression = "neutro", size = 96, react = null, idle = true, className = "", title = "Danny" }: DannyProps) {
  const [blink, setBlink] = useState(false);
  const [reaction, setReaction] = useState<DannyProps["react"]>(react);

  // Blink casuale ogni 3–7 s.
  useEffect(() => {
    if (!idle) return;
    let timer: ReturnType<typeof setTimeout>;
    let alive = true;
    const loop = () => {
      timer = setTimeout(() => {
        if (!alive) return;
        setBlink(true);
        setTimeout(() => setBlink(false), 180);
        loop();
      }, 3000 + Math.random() * 4000);
    };
    loop();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [idle]);

  // Reazione: rimuove la classe dopo l'animazione per poterla riattivare.
  useEffect(() => {
    setReaction(react);
    if (!react) return;
    const t = setTimeout(() => setReaction(null), 900);
    return () => clearTimeout(t);
  }, [react, expression]);

  const eyes = eye(expression, CX - GAP / 2, CY, "l") + eye(expression, CX + GAP / 2, CY, "r");
  const cls = ["danny", reaction ? `danny-${reaction}` : "", blink ? "danny-blink" : "", className].filter(Boolean).join(" ");

  return (
    <svg className={cls} viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={title}>
      <g className="danny-body">
        <path d="M50 10a40 40 0 1 1 0 80a40 40 0 1 1 0-80z" fill={BODY} />
        <ellipse cx="32" cy="27" rx="9" ry="5" fill="#fff" opacity="0.22" transform="rotate(-35 32 27)" />
        <g className="danny-lids" dangerouslySetInnerHTML={{ __html: eyes }} />
      </g>
    </svg>
  );
}
