# Design system

Derivato dal poster di riferimento in `docs/reference/01-full-house.png`: grafica piatta da poster editoriale, verde feltro, carte crema con pips grandi, accenti corallo e ocra, griglia "blueprint" sul fondo, etichette tecniche in monospace. Nessun logo o marchio: solo lo stile.

I token vivono in `src/ui/styles/tokens.css` (CSS custom properties). Cambiare lì cambia tutta l'app.

## Colori

| Token | Valore | Uso |
|---|---|---|
| `--felt-900 … --felt-600` | `#163a2c` → `#2f7358` | fondo, superfici, tavolo (più chiaro = più in rilievo) |
| `--paper-100 … --paper-400` | `#fff7e0` → `#c9bb97` | carte, testo, testo attenuato |
| `--ink-900` | `#161512` | picche, fiori, testo su carta, Danny |
| `--coral-500` | `#f1623f` | cuori, quadri, azione primaria (Bet/Raise), tab attiva |
| `--ochre-500` | `#e8b83a` | marker tecnici: piatto, stack, giocatore di turno, badge |
| `--chip-*` | bianco / rosso / blu / verde / nero | fiche |

Semantici: `--bg`, `--surface`, `--text`, `--text-muted`, `--accent`, `--warn`, `--ok`, `--danger`, `--card-face`, `--card-ink`, `--card-red`.

Contrasto: testo crema su `--felt-800` ≈ 9:1; inchiostro su crema ≈ 16:1; corallo su crema ≈ 3,3:1 (usato solo per pips grandi e titoli, mai per testo piccolo).

## Tipografia

- Display: **Archivo Black** (titoli, rank delle carte, figure).
- Interfaccia: **Space Grotesk** 400/600/700.
- Tecnica: **JetBrains Mono** (numeri, chip, etichette `label` maiuscole con letter-spacing 0,08 em).

Tutti i font sono open source (SIL OFL), self-hosted via `@fontsource/*`, inclusi nel precache: funzionano offline.

Scala: `--text-xs` 12 px → `--text-2xl` 40 px. Numeri sempre `tabular-nums` e in formato italiano (`src/ui/format.ts`).

## Componenti

- **Carta** (`src/ui/cards/PlayingCard.tsx`): SVG 100×140, angoli 9, indice rank+seme negli angoli (anche ruotato), pips grandi disposti come nelle carte francesi, figure come lettera grande con il seme sotto, Asso come seme gigante. Retro a scacchi `--ink-900` su `--paper-200`. Stati: `highlight` (vincente), `dimmed` (foldata), animazione `pcard-deal`.
- **Tavolo** (`src/ui/table/Table.tsx`): ovale con gradiente radiale, 6 seat in percentuale (utente sempre in basso), board e piatto al centro. Rapporto 3:4 su iPhone, 4:3 da 720 px in su.
- **Seat**: targa scura con nome, stack in ocra, button "D", puntata della street con fiche; bordo ocra pulsante per chi deve agire, verde `--ok` per il vincitore.
- **Barra azioni**: tre pulsanti alti 56 px (Fold scuro, Check/Call crema, Bet/Raise corallo); slider con scorciatoie min / ½ piatto / ¾ piatto / piatto / all-in.
- **Danny** (`src/ui/danny/Danny.tsx`): la mascotte, cerchio nero con occhi bianchi, senza arti; espressioni: neutro, contento, ridente, sorpreso, pensoso, scettico, occhiolino, stellato, triste, ko. Respira, sbatte le palpebre, reagisce con `hop`/`wobble`.
- **Pannello** `.panel`, **badge** `.badge` (ocra, mono), **etichetta** `.label`, pulsanti `.btn` (+ `-primary`, `-paper`, `-ghost`, `-block`), input `.input`.
- **Tab bar**: fissa in basso su iPhone (sopra la safe area), in alto su desktop.

## Touch e accessibilità

- Target minimi 48 px (`--tap`); azioni di gioco 56 px.
- `viewport-fit=cover` e `env(safe-area-inset-*)` per iPhone con notch; `apple-mobile-web-app-capable` per lo schermo intero dalla Home.
- `prefers-reduced-motion`: tutte le durate a 0 e Danny fermo.
- Niente selezione del testo sul tavolo (`user-select: none`), tranne negli input.

## Animazioni

| Nome | Durata | Dove |
|---|---|---|
| `card-deal` | `--dur-slow` 480 ms, `--ease-spring` | arrivo delle carte (ritardo 90 ms tra le due hole card) |
| `seat-pulse` | 1,2 s loop | bordo del giocatore di turno |
| `danny-breathe` / `danny-blink` / `danny-hop` / `danny-wobble` | 3,6 s / 180 ms / 700 ms / 800 ms | Danny |

Da fare nelle fasi successive: fiche che volano verso il piatto, flip delle carte allo showdown, transizione fra le street.
