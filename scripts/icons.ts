/**
 * Genera le icone della PWA (public/icons/) con Danny su fondo verde feltro.
 * Uso: npx tsx scripts/icons.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const FELT = "#1f4d3a";
const INK = "#fff";
const S = 1.15, CX = 51, CY = 52, GAP = 16;
const w = 7 * S, h = 15 * S;
const pill = (x: number, y: number) => `<rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="${w / 2}" fill="${INK}"/>`;

function svg(size: number, maskable: boolean): string {
  // Area sicura per le icone maskable: Danny occupa il 60 % del lato.
  const scale = maskable ? 0.6 : 0.74;
  const t = `translate(${(size * (1 - scale)) / 2} ${(size * (1 - scale)) / 2}) scale(${(size * scale) / 100})`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${FELT}"/>
  <g transform="${t}">
    <path d="M50 10a40 40 0 1 1 0 80a40 40 0 1 1 0-80z" fill="#0e0e0e"/>
    <ellipse cx="32" cy="27" rx="9" ry="5" fill="#fff" opacity="0.22" transform="rotate(-35 32 27)"/>
    ${pill(CX - GAP / 2, CY)}${pill(CX + GAP / 2, CY)}
  </g>
</svg>`;
}

mkdirSync("public/icons", { recursive: true });
for (const [name, size, maskable] of [
  ["icon-192.png", 192, false],
  ["icon-512.png", 512, true],
  ["apple-touch-icon.png", 180, false],
] as const) {
  const png = new Resvg(svg(size, maskable), { fitTo: { mode: "width", value: size } }).render().asPng();
  writeFileSync(`public/icons/${name}`, png);
  console.log("scritto", name);
}
writeFileSync("public/icons/favicon.svg", svg(64, false));
