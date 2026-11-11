# cams-eleven — Specifica di progetto

Versione 0.1 — Fase 0 (11 novembre 2026). Questo file è la fonte di verità del progetto: ogni fase lo aggiorna. Le sezioni marcate **[Fase N]** vengono dettagliate quando quella fase inizia.

---

## 1. Scopo

Palestra personale per imparare da zero e diventare bravo a tre giochi di carte, giocando contro bot: **Texas Hold'em** (prima), **Blackjack** con conteggio delle carte, **poker all'italiana**. Un solo utente (CAM). Niente soldi veri, niente multiplayer, niente pubblicità, niente chiamate a Claude o ad altre API a runtime.

Obiettivo secondario: allenamento mentale (calcolo, probabilità, critical thinking).

## 2. Principi

1. **Tutto ciò che può fare un programma lo fa un programma.** Engine, bot, equity, coach, statistiche, ripasso: codice nel repo. Il ragionamento di Claude serve a progettare, scrivere codice e scrivere i contenuti una volta sola.
2. **Nessun numero a memoria.** Ogni probabilità, frequenza, vantaggio del banco o soglia strategica citata nelle lezioni o usata dal coach ha uno script in `scripts/` che la riproduce, un output salvato in `data/` e un test che fallisce se il valore cambia oltre la tolleranza statistica. Le fonti esterne (libri, siti di riferimento) servono da riscontro: se simulazione e fonte divergono, vince la simulazione e la divergenza viene documentata.
3. **Idee nuove sono benvenute, ma etichettate.** Oltre alle regole e ai trucchi noti, in ogni fase Claude propone trucchi o regole pratiche proprie (il **Laboratorio di Danny**, sezione 7.1): ipotesi scritte come script di simulazione, tenute solo se la simulazione mostra un vantaggio misurabile, e presentate nelle lezioni con l'etichetta "derivata da simulazione, N mani, intervallo di confidenza X". Dove la simulazione boccia l'idea, il risultato negativo resta nel repo (`data/lab/`) perché anche "non funziona" è un'informazione.
4. **Semplice, solido, modificabile.** Stack diffuso, moduli puri, codice commentato in italiano con termini tecnici in inglese, perché verrà modificato in altre chat.
5. **Offline first.** Tutto funziona senza rete; la sincronizzazione è un'aggiunta.
6. **Niente barare.** I "trucchi" sono strategie lecite.

## 3. Vincoli

- Repo GitHub pubblico `cams-eleven`, sito su GitHub Pages (`https://whimsicam.github.io/cams-eleven/`), deploy via GitHub Actions.
- Funziona su iPhone (Safari, aggiunto alla schermata Home) e desktop, anche offline.
- Progressi: prima nel browser, poi scritti nel repo via GitHub Contents API con token fine-grained (Contents read/write, solo questo repo) inserito dall'utente nelle impostazioni e conservato solo nel `localStorage`.
- Interfaccia in italiano, termini tecnici in inglese (fold, check, raise, outs, pot odds, equity, running count, basic strategy, hit/stand/double/split). Per il poker all'italiana si usano i termini tradizionali italiani (invito, apertura, cambio, colore, full).
- Formati numerici europei: `Intl.NumberFormat("it-IT")` ovunque (virgola decimale, punto migliaia).

## 4. Struttura dell'app

Uno **switch di gioco** in alto (nascosto finché esiste solo l'Hold'em) e quattro tab fisse, uguali per ogni gioco:

| Tab | Cosa fa |
|---|---|
| **Gioca** | Partite libere contro bot. Difficoltà: Facile, Medio, Difficile, Avanzato. Nessuna interruzione, nessun numero a schermo (come dal vivo). Il riepilogo di Danny è disponibile a fine mano, su richiesta. |
| **Allenamento** | Due modalità. (a) *Partita assistita*: si gioca, ma Danny interviene con card contestuali nelle situazioni rilevanti, prima o dopo l'azione (impostazione), mostrando outs, equity, pot odds. (b) *Drill*: esercizi mirati a tempo (outs, pot odds, hand ranking, calcolo mentale, poi basic strategy e conteggio). A livelli. |
| **Lezioni** | Prima le regole, poi situazioni precise e cosa fare. Organizzate a livelli con sblocco *consigliato* (mai obbligatorio). Ogni lezione finisce con un esercizio o una mano da giocare. |
| **Progressi** | Cosa ho imparato, dove sbaglio di più, cosa ripassare (spaced repetition), statistiche di gioco, stato della sincronizzazione, impostazioni (token, regole, preferenze). |

Il **Percorso** per ogni gioco è una sequenza di step: lezione → drill → partita assistita con obiettivo (es. "20 mani con accuracy ≥ 90 % sulle decisioni preflop"). Lo step successivo appare come "consigliato"; tutto resta accessibile.

## 5. Danny, il coach

Danny è la mascotte e il volto del coach. È la forma **Tondo** del laboratorio Atypicam (cerchio nero, occhi bianchi a pillola, riflesso in alto a sinistra), **senza braccia né gambe**. Nel repo vive come componente SVG generato da codice (`src/ui/danny/`), con le espressioni del laboratorio, così può reagire:

| Situazione | Espressione |
|---|---|
| Suggerisce / spiega | pensoso |
| Decisione sbagliata | scettico |
| Decisione corretta | contento |
| Bad beat, cooler | sorpreso |
| "Trucco" dei bravi | occhiolino |
| Attesa, idle | neutro, con blink e sguardo |
| Vittoria di sessione | ridente / stellato |

Ogni output del coach è una **Danny card**: espressione, titolo breve, verdetto (cosa avrebbe fatto la strategia di riferimento), i numeri (equity, pot odds, EV, outs), una riga di "perché", link alla lezione pertinente, e il pulsante **Chiedi a Claude** che copia negli appunti un messaggio pronto con tutto il contesto (gioco, posizione, stack, board, azione tua, verdetto di Danny e numeri). Animazioni rispettano `prefers-reduced-motion`.

## 6. Giochi

### 6.1 Texas Hold'em [Fase 1–3]

**Formato di default**: No-Limit cash game, tavolo da 6 (utente + 5 bot), blind 1/2, stack iniziale 100 big blind, ricarica libera a fine mano. Valuta: chip con bankroll fittizio persistente (serve per la lezione sul bankroll e per il win rate). Sit & go / torneo: opzione futura.

**Engine** (`src/engine/holdem/`): dealer button, blind, giri di puntata (preflop, flop, turn, river), min-raise, all-in, side pot multipli, showdown con split pot e odd chip, muck. Deterministico dato un seed (necessario per test e replay).

**Hand evaluator** (`src/engine/cards/evaluator.ts`): valuta 5–7 carte. Test oracolo: enumerazione completa delle 2 598 960 mani da 5 carte con conteggi noti per categoria (4 royal flush, 36 straight flush, 624 poker, 3 744 full house, 5 108 flush, 10 200 straight, 54 912 tris, 123 552 doppia coppia, 1 098 240 coppia, 1 302 540 carta alta).

**Equity**: Monte Carlo in Web Worker (mai sul thread UI), con numero di campioni configurabile e intervallo di confidenza mostrato. Enumerazione esatta quando il numero di combinazioni è piccolo (turn e river).

**Bot**:
- *Facile*: loose-passive (calling station); decide su forza assoluta della mano con soglie fisse; non bluffa.
- *Medio*: tight-aggressive; range preflop per posizione da tabella (`data/holdem/preflop-ranges.json`, generata da script); postflop su forza della mano e progetti, consapevole delle pot odds; continuation bet semplice.
- *Difficile*: ragiona per range: stima il range avversario dalle azioni, equity vs range via Monte Carlo, semi-bluff con progetti, bet sizing in funzione del board.
- *Avanzato*: aggiunge opponent modeling sull'utente (VPIP, PFR, fold to c-bet, aggressione), bluff con blocker, strategie miste randomizzate con seed.

I bot hanno un tempo di reazione di circa 1 s con animazione delle carte; opzione "veloce".

**Coach** (strategia di riferimento): preflop da tabelle di range per posizione e azione precedente; postflop da equity vs range stimato, pot odds, implied odds semplificate, EV di call/raise/fold. Il coach etichetta ogni verdetto con la fonte: "tabella", "simulazione", "euristica".

**Statistiche** [Fase 3]: VPIP, PFR, 3-bet %, aggression factor, win rate (bb/100), showdown won, per sessione e cumulate.

### 6.2 Blackjack [Fase 4–5]

Regole configurabili con default europeo: 6 mazzi, dealer stands on soft 17 (S17), blackjack paga 3:2, double after split (DAS) sì, surrender no, no hole card (stile europeo), resplit fino a 3 mani, no resplit degli assi, penetrazione del sabot configurabile.

Basic strategy generata per set di regole (`scripts/blackjack/basic-strategy.ts` → `data/blackjack/basic-strategy-<ruleset>.json`) e verificata con simulazione: il vantaggio del banco simulato deve essere coerente con i valori di riferimento per quelle regole entro l'intervallo di confidenza, altrimenti il test fallisce.

Conteggio [Fase 5]: Hi-Lo, running count, true count (per mazzi residui), variazione delle puntate, deviazioni principali (Illustrious 18 e Fab 4, verificate per simulazione sulle nostre regole), modalità "allenamento conteggio" con verifica a sorpresa, drill di velocità. Le lezioni dicono chiaramente che in partite casalinghe con mazzi mescolati di frequente il conteggio vale poco in termini di vantaggio.

### 6.3 Poker all'italiana [Fase 6]

Regole tradizionali (verificate su pagat.com e Sisal; da confermare quelle "di casa"):
- Mazzo ridotto: carta più bassa = 11 − numero di giocatori (4 giocatori → 32 carte, dal 7 all'Asso).
- Gerarchia: scala reale (massima > media > minima, ma la minima batte la massima), poker, **colore batte full**, scala, tris, doppia coppia, coppia, carta alta.
- Gerarchia dei semi per gli spareggi: cuori > quadri > fiori > picche.
- L'Asso vale anche come carta bassa nella scala minima.
- Invito, apertura con almeno coppia di J (o progetto di scala reale); se nessuno apre si rimescola e l'apertura sale a Q, K, A.
- Un solo cambio da 0 a 4 carte (variante: massimo 3, 4 solo mostrando l'Asso), poi secondo giro di puntate e showdown.

Strategia di riferimento derivata interamente da simulazione (probabilità di chiusura per ogni tipo di cambio, equity delle mani di partenza con il mazzo ridotto), perché la letteratura è scarsa.

## 7. Lezioni

- File Markdown in `content/lessons/<gioco>/<nn>-<slug>.md` con frontmatter: `title`, `game`, `level`, `order`, `summary`, `sources[]` (titolo, autore, URL o riferimento), `verifiedBy[]` (script e file dati che confermano i numeri), `exercise` (tipo: drill, mano scriptata, domanda).
- Ogni lezione: concetto → numeri (con riferimento al file in `data/`) → errore tipico del principiante → esercizio finale.
- Mani scriptate: scenari a seed fisso (`content/scenarios/`) che mettono l'utente nella situazione della lezione.
- Fonti principali attese: Hold'em — Sklansky & Malmuth (*Theory of Poker*), Harrington (*Harrington on Hold'em*), Miller/Mehta/Flynn (*Professional No-Limit Hold'em*), Janda (*Applications of No-Limit Hold'em*), Upswing/Red Chip (articoli); Blackjack — Thorp (*Beat the Dealer*), Wong (*Professional Blackjack*), Schlesinger (*Blackjack Attack*), Wizard of Odds (tabelle di vantaggio); Poker italiano — pagat.com, regolamenti tradizionali. Ogni lezione cita le proprie.

### 7.1 Laboratorio di Danny (trucchi derivati da simulazione)

Avvertenza onesta: nell'Hold'em la strategia teorica è già molto studiata (solver, letteratura), quindi non è realistico "inventare" strategie migliori di quelle note. Dove invece la simulazione può produrre trucchi nuovi e utili:
- **Regole semplificate con costo misurato**: euristiche da tenere a mente al tavolo (es. "con un progetto di colore al flop chiama se la puntata è sotto un terzo del piatto") con quanto perdono rispetto alla strategia completa, così si sa cosa si sacrifica per la semplicità.
- **Adattamenti exploitative** a tipi di avversario frequenti tra amici (calling station, chi non folda mai la coppia alta, chi rilancia sempre in posizione): quanto vale deviare dalla strategia "da libro" contro quel profilo.
- **Poker all'italiana e tavoli da 4–6**: letteratura scarsa, quindi quasi tutto (cambi, aperture, bluff) va derivato da simulazione.
- **Conteggio in casa**: quanto vale davvero il conteggio con 1–2 mazzi mescolati spesso, e quale bet spread ha senso.

Ogni esperimento: `scripts/lab/<slug>.ts` → `data/lab/<slug>.json` (risultato, N, intervallo di confidenza, data) → lezione o Danny card solo se il vantaggio è significativo. Ritmo: due o tre esperimenti per fase, non di più, per non rallentare lo sviluppo.

## 8. Drill e ripasso

Drill: outs (data la mano e il board, quanti outs), pot odds (chiamare o no), hand ranking (chi vince), calcolo mentale (equity rule of 2 and 4, break-even %), poi basic strategy e conteggio. Ogni risposta registra `{ drill, item, correct, ms, timestamp }`.

Spaced repetition: algoritmo SM-2 semplificato per *item* (es. "KQo da UTG", "16 vs 10"); gli errori in partita assistita e nei drill creano o rinforzano item; la tab Progressi mostra gli item "da ripassare oggi".

## 9. Progressi e sincronizzazione

### 9.1 Modello dati (JSON, versionato)

```
{
  "schema": 1,
  "deviceId": "iphone-…",           // generato alla prima apertura
  "updatedAt": "ISO",
  "hands": [ { id, game, ts, mode, result, decisions:[{street, action, verdict, ev}] } ],
  "drills": [ { id, drill, item, correct, ms, ts } ],
  "lessons": { "<lessonId>": { status, completedAt } },
  "srs": { "<itemId>": { ease, interval, due, lastReview } },
  "bankroll": { "holdem": n, "blackjack": n, "draw": n },
  "settings": { ... }                // senza token
}
```

### 9.2 Storage locale

IndexedDB (via `idb`) per mani e drill (volumi crescenti); `localStorage` per impostazioni, token e coda di sync. Salvataggio a fine mano / fine drill, non a ogni click.

### 9.3 Sync su GitHub

- Branch dedicato **`data`** del repo, mai toccato dal deploy. File `progress/<deviceId>.json`, uno per dispositivo: nessun conflitto di scrittura tra dispositivi.
- All'avvio: `GET` di tutti i file in `progress/` (Contents API), merge con il locale. Regole di merge deterministiche: union per id su `hands` e `drills`; per `lessons` vince lo stato più avanzato; per `srs` e `settings` vince l'`updatedAt` più recente; `bankroll` ricalcolato dalle mani.
- Scrittura: `PUT` del proprio file con lo `sha` corrente, debounce (fine sessione o ogni N mani). Su `409` si rilegge e si ritenta. Offline: la scrittura va in coda e parte al ritorno della rete (`online` event + tentativo all'avvio).
- Token: solo in `localStorage`, mai nel codice, nei file del repo o nei log. Su `401`/`403` la tab Progressi mostra "token scaduto o non valido" con il campo per reinserirlo. Il token fine-grained ha scadenza (al massimo un anno): la UI lo ricorda.
- Il repo è pubblico: i file di progresso sono leggibili da chiunque. Non contengono dati sensibili (solo mani giocate e risultati).

## 10. Stack e struttura del repo

**Stack**: Vite + TypeScript + React, Zustand (state), `idb` (IndexedDB), `vite-plugin-pwa` (Workbox, offline, manifest), Vitest (test), GitHub Actions (test + deploy su Pages). Nessun CSS framework: CSS custom properties dai design token. Font open source self-hosted.

Alternative scartate: Svelte (ottimo ma meno "lingua franca" per modifiche future), vanilla JS (state ingestibile con tre giochi), Next.js (SSR inutile su Pages), canvas/Phaser (overkill per carte flat SVG, peggiora accessibilità e touch).

```
cams-eleven/
  SPEC.md                      questo file
  README.md                    come avviare, testare, pubblicare
  docs/design-system.md        token, componenti, animazioni
  docs/reference/              immagini di riferimento della UI
  src/engine/cards/            mazzo, shuffle (seedable), evaluator
  src/engine/holdem/           regole, puntate, side pot, showdown
  src/engine/blackjack/        [Fase 4]
  src/engine/draw/             [Fase 6]
  src/strategy/                range, basic strategy, Hi-Lo, coach
  src/bots/                    bot per gioco e livello
  src/ui/                      componenti React, tavolo e carte SVG, Danny
  src/progress/                storage locale, sync GitHub, SRS, statistiche
  src/workers/                 Monte Carlo equity
  content/lessons/             lezioni Markdown con frontmatter
  content/scenarios/           mani scriptate a seed fisso
  data/                        tabelle generate (commit nel repo)
  scripts/                     simulazioni e generatori (Node), rieseguibili
  tests/                       unit, oracoli, test statistici
  .github/workflows/           ci.yml (test), deploy.yml (Pages), data-check.yml (rigenera data/ su richiesta)
```

Gli engine sono moduli TypeScript puri senza dipendenze dalla UI: girano nei test, negli script Node e nel browser.

## 11. Design system

Derivato dal poster di riferimento (`docs/reference/01-full-house.png`): poster editoriale, grafica piatta, griglia "blueprint", carte grandi e inclinate.

**Token colore**: `--felt` verde scuro (fondo), `--felt-line` verde più chiaro (griglia), `--paper` crema (carte, testo), `--ink` nero (picche, fiori, testo su carta), `--coral` corallo (cuori, quadri, accento primario), `--ochre` giallo ocra (marker, badge), `--chip-*` per le fiche. Contrasto AA verificato.

**Tipografia**: display grotesk pesante per titoli, grotesk regolare per testo, monospace per numeri e etichette tecniche (chip, pot, count). Numeri tabulari.

**Componenti**: carta SVG (fronte con pips grandi, retro con pattern a scacchi), tavolo SVG, fiche, Danny card, pulsanti d'azione (altezza ≥ 48 px su iPhone, a tutta larghezza in basso), tab bar, slider per il bet sizing, badge di livello.

**Animazioni**: distribuzione delle carte, flip, chip verso il piatto, evidenziazione del vincitore. Tutte disattivabili (`prefers-reduced-motion` e impostazione).

**Layout**: mobile-first; su iPhone la mano dell'utente occupa la parte bassa, azioni sopra la safe area; su desktop tavolo centrato con pannello laterale per Danny.

## 12. Qualità

- Test unitari: evaluator (oracolo enumerativo), shuffle (uniformità, test chi-quadro con seed), engine Hold'em (side pot, min-raise, split pot, casi limite), merge dei progressi, formattazione numerica.
- Test statistici: equity Monte Carlo vs valori enumerati con tolleranza; vantaggio del banco della basic strategy [Fase 4]; valore del conteggio [Fase 5].
- Ogni numero citato nelle lezioni ha un test (`tests/lessons/`) che lo ricalcola dal file in `data/`.
- CI: `ci.yml` esegue lint, type-check e test su ogni push e pull request; `deploy.yml` pubblica su Pages solo quando cambia `main` fuori da `data/progress`.
- Codice commentato in italiano; funzioni pure dove possibile; nessun `any`.

## 13. Fasi

Dopo ogni fase: stato, cosa manca, checklist di prova (iPhone e desktop), attesa dell'ok.

| Fase | Contenuto |
|---|---|
| **0** | Domande e specifica (questo documento). |
| **1** | Fondamenta + Hold'em giocabile: repo, CI, deploy, PWA installabile e offline, design system e Danny, engine completo, evaluator con oracolo, bot Facile e Medio, tab Gioca, storage locale, sync su GitHub con token. |
| **2** | Danny coach, tab Allenamento (partita assistita + drill outs/pot odds/hand ranking/calcolo mentale), equity Monte Carlo in worker, Lezioni livello 1–2 (regole, hand ranking, posizione, starting hands, outs e pot odds), pulsante "Chiedi a Claude", Percorso Hold'em. |
| **3** | Diventare bravo a Hold'em: bot Difficile e Avanzato, lezioni avanzate (range, board texture, bluff e semi-bluff, bet sizing, bankroll, errori tipici), statistiche, spaced repetition. |
| **4** | Blackjack: switch di gioco, engine con regole configurabili, basic strategy generata e verificata, coach, lezioni (regole, basic strategy), drill. |
| **5** | Conteggio delle carte: lezioni, drill, modalità allenamento conteggio, simulazione del valore del conteggio. |
| **6** | Poker all'italiana: engine, bot, coach sui cambi, lezioni; conferma delle regole di casa. |
| **7** | Rifiniture: grafica, performance, ripasso spaziato cross-gioco, pulizia. |

## 14. Decisioni prese

- Repo pubblico unico; progressi sul branch `data`.
- Hold'em per primo; gli altri giochi arrivano con uno switch.
- Sblocco soft dei livelli; nessuna gamification oltre a livelli e statistiche.
- Gioca = nessun numero a schermo; Allenamento = Danny interviene.
- Danny nero con occhi bianchi, senza arti.
- Strategie derivate da simulazione sono ammesse ed etichettate.
- Installazione su iPhone: sito aggiunto alla schermata Home (PWA con manifest e service worker; nessuna app store).

## 15. Decisioni aperte

- (chiuso) Username GitHub: whimsicam.
- Regole "di casa" di blackjack e poker all'italiana (si chiedono nelle Fasi 4 e 6).
- Sit & go / torneo per l'Hold'em (dopo la Fase 3, se serve).

## 16. Glossario minimo

VPIP (voluntarily put money in pot), PFR (preflop raise), c-bet (continuation bet), outs, pot odds, implied odds, equity, EV (expected value), range, blocker, S17/H17, DAS, running count, true count, SRS (spaced repetition system).

## 17. Stato delle fasi

### Fase 1 — completata il 11/11/2026, in attesa di verifica dell'utente
- Fatto: repo e struttura, CI (type-check, test, build) e deploy automatico su Pages, PWA installabile e offline, design system (`docs/design-system.md`), Danny in SVG, carte e tavolo SVG, engine Hold'em (puntate, side pot, showdown) con test fuzz, evaluator con oracolo enumerativo, shuffle con test chi-quadro, equity Monte Carlo ed esatta, tabella di equity preflop (169 mani, `data/holdem/preflop-equity.json`), bot Facile e Medio, tab Gioca e Progressi, storage locale, sync su branch `data` con coda offline.
- Test: 49 passati in CI.
- Rimandato alla Fase 2: tab Allenamento e Lezioni, Danny card del coach, pulsante "Chiedi a Claude", primi esperimenti del Laboratorio.
