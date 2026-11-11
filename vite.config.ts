/// <reference types="vitest/config" />
// Configurazione Vite: build statica per GitHub Pages (sotto /cams-eleven/),
// PWA installabile e offline tramite vite-plugin-pwa (Workbox), alias dei percorsi.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";

const alias = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  // GitHub Pages pubblica il sito in una sottocartella con il nome del repo.
  base: "/cams-eleven/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["fonts/*.woff2", "icons/*.png", "icons/*.svg"],
      manifest: {
        name: "cam's eleven",
        short_name: "cam's eleven",
        description: "Palestra personale di Hold'em, blackjack e poker all'italiana",
        lang: "it",
        start_url: "/cams-eleven/",
        scope: "/cams-eleven/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#1f4d3a",
        theme_color: "#1f4d3a",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Precache di tutto il build: l'app funziona interamente offline.
        globPatterns: ["**/*.{js,css,html,woff2,png,svg,json}"],
        navigateFallback: "/cams-eleven/index.html",
        // Le chiamate alla GitHub API non vanno mai in cache.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.github\.com\/.*/i,
            handler: "NetworkOnly",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@engine": alias("./src/engine"),
      "@strategy": alias("./src/strategy"),
      "@bots": alias("./src/bots"),
      "@ui": alias("./src/ui"),
      "@progress": alias("./src/progress"),
      "@data": alias("./data"),
    },
  },
  worker: { format: "es" },
  build: { target: "es2022", sourcemap: false },
  test: {
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
    environment: "node",
    testTimeout: 120_000,
  },
});
