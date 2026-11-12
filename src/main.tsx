/** Entry point: font, stili globali, registrazione del service worker (PWA) e avvio della sync. */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
// Display: Bricolage Grotesque (variabile, self-hosted per l'offline). Il testo usa il font di sistema.
import "@fontsource-variable/bricolage-grotesque/opsz.css";
import "./ui/styles/global.css";
import { App } from "./ui/App";
import { initSync } from "./progress/sync";

registerSW({ immediate: true });
initSync();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
