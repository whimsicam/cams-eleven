/** Registro dei bot per livello. Difficile e Avanzato arrivano in Fase 3 (per ora usano il Medio). */
import { easyBot } from "./easy";
import { mediumBot } from "./medium";
import type { Bot, BotLevel } from "./types";

export { buildBotView } from "./view";
export * from "./types";

export function botFor(level: BotLevel): Bot {
  switch (level) {
    case "easy":
      return easyBot;
    case "medium":
    case "hard":
    case "expert":
      return mediumBot;
  }
}
