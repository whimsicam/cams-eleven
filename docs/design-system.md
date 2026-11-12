# Design system

Versione 2 (12/11/2026). Riferimento: `docs/reference/01-full-house.png` (verde feltro, crema, corallo, carte piatte). La v1 ne riprendeva tutto alla lettera (griglia di fondo, ocra ovunque, etichette monospace maiuscole, retro a scacchi neri) e risultava pesante: la v2 ne tiene i colori e la piattezza, e toglie il resto.

Principi:
- **Un verde, un accento.** Il corallo indica solo l'azione principale, la tab attiva e i semi rossi. L'oro solo "tocca a te / tocca a lui".
- **Il tavolo è il protagonista**, tutto il resto è sottovoce: superfici appena più chiare del fondo, bordi da 1 px, nessuna ombra pesante.
- **Comandi come su iPhone**: tab bar in basso con 4 voci, touch target ≥ 44 pt, safe area rispettate, fogli che salgono dal basso (Apple HIG, skill apple-design).

## Colori (`src/ui/styles/tokens.css`)

| Token | Valore | Uso |
|---|---|---|
| `--green-950` | #102520 | tab bar, campi di testo |
| `--green-900` | #16302a | fondo dell'app |
| `--green-850` | #1b3832 | pannelli, fogli, la tua mano |
| `--green-800` | #20423a | feltro del tavolo |
| `--green-700` | #2a5348 | retro delle carte |
| `--paper` | #f6f1e3 | testo principale |
| `--paper-dim` | #b8c4ba | testo secondario (tinto di verde, mai grigio) |
| `--paper-faint` | #8fa298 | etichette brevi |
| `--ink` | #17191a | semi neri e valori sulla carta |
| `--red-suit` | #c93d24 | semi rossi sulla carta |
| `--coral` | #f07253 | azione principale, tab attiva, fiches |
| `--gold` | #e9c46a | turno |
| `--win` / `--loss` | #8fd6a8 / #f29a86 | vinto / perso |

Contrasti verificati da `tests/ui/contrast.test.ts` (testo ≥ 4,5:1, simboli ≥ 3:1). Il rosso dei semi è stato scurito da #d2442a (4,26:1, insufficiente) a #c93d24 (4,70:1) proprio grazie a quel test.

## Tipografia

- **Testo e comandi**: font di sistema (SF Pro su iPhone e Mac). Nessun file da scaricare, ottima leggibilità, cifre tabulari (`font-variant-numeric: tabular-nums`) per stack e piatto.
- **Display**: Bricolage Grotesque (variabile, self-hosted per l'offline) per titoli, stack della tua mano, importo della puntata e valori sulle carte. Peso 600–650, mai nero.
- Scala: 12 · 14 · 16 (corpo) · 19 · 26 · 36 px.
- Scartati: Archivo Black + Space Grotesk + JetBrains Mono della v1 (tre famiglie, il monospace usato come costume "tecnico").

## Carte (`src/ui/cards/`)

- **Semi simmetrici per costruzione** (`suits.ts`): ogni seme è disegnato solo nella metà destra e specchiato via codice; `tests/ui/suits.test.ts` verifica che ogni punto abbia il suo specchio. Tutte le forme sono tracciate in senso orario (con versi opposti le sovrapposizioni dei fiori si bucavano).
- Indice d'angolo in una colonna stretta (x = 12), separata dai pips.
- Pips nella disposizione delle carte francesi; la metà bassa è ruotata di 180°.
- Figure: cornice, emblema (Re corona, Regina diadema, Fante berretto) in alto e capovolto in basso, seme al centro. Simmetriche a specchio e per rotazione.
- Retro: verde con reticolo crema leggero.
- `MiniCard`: valore e seme grandi in 30 × 40 px, per showdown dei bot ed esempi della classifica.

## Layout

- **Shell**: griglia alta come lo schermo; la tab bar è una riga della griglia, non un elemento fisso, quindi resta sempre in fondo e la pagina non scorre mai. Su schermi ≥ 900 px la tab bar diventa una barra laterale.
- **Play**: barra in alto (uscita, livello e mano, risultato della sessione, Danny, "Punti") → tavolo (prende lo spazio rimanente) → la tua mano (carte grandi, stack, posizione, punto attuale) → azioni. Le tue carte non stanno sul tavolo, così non coprono mai i pulsanti.
- **Puntata**: il pannello sostituisce la riga Fold/Call/Raise (non si sovrappone alla tab bar): importo, slider, 5 scorciatoie in colonne identiche (Min · ½ pot · ¾ pot · Pot · All-in), Annulla e conferma.
- **Classifica dei punti**: foglio dal basso, si chiude toccando fuori, con la X, trascinandolo giù o con Esc; evidenzia il tuo punto attuale.
- Verificato a 390 × 844 (iPhone 13/14), 375 × 667 (iPhone SE) e 1366 × 860 (desktop).

## Danny (`src/ui/danny/`)

Cerchio nero, occhi bianchi, riflesso; niente arti. Come Beta di camstudy:
- gli occhi seguono mouse e dito (un solo listener globale);
- sbatte le palpebre ogni 3–7 s, ogni tanto saltella da solo;
- al tocco reagisce a caso per 1,6 s: contento e salta, arrabbiato e trema, occhi a stella e balla, KO e gira…;
- in partita segue la mano: pensoso quando tocca a te, contento o a stella se vinci, triste se perdi.
Nella barra in alto sta su un alone chiaro, altrimenti nero su verde scuro si perde.
Le sue animazioni usano un easing elastico: il detector di impeccable lo segnala come avviso, è una scelta voluta (è il carattere della mascotte) ed è limitato a lui.

## Animazioni

Brevi e funzionali: carte che si posano (420 ms, ease-out), fogli che salgono, cambio di stato dei pulsanti. Tutte azzerate con "Riduci movimento".
