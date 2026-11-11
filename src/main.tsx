/** Entry point: font, stili globali, registrazione del service worker (PWA) e avvio della sync. */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/archivo-black/400.css";
import "@fontsource/jetbrains-mono/400.css";
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
