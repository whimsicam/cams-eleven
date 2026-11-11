# cam's eleven

Palestra personale per imparare e diventare bravo a Texas Hold'em, blackjack (con conteggio delle carte) e poker all'italiana. Solo io contro bot: niente soldi veri, niente multiplayer, niente pubblicità, nessuna chiamata a servizi esterni a runtime.

Sito: https://whimsicam.github.io/cams-eleven/ — la specifica completa è in [SPEC.md](SPEC.md).

## Comandi

```bash
npm install        # dipendenze
npm run dev        # sviluppo locale (http://localhost:5173/cams-eleven/)
npm test           # test (engine, oracoli, test statistici)
npm run build      # type-check + build in dist/
npm run gen:preflop  # rigenera data/holdem/preflop-equity.json (Monte Carlo)
```

## Struttura

- `src/engine/` motori di gioco puri (nessuna dipendenza dalla UI), testati in `tests/`
- `src/strategy/` strategie di riferimento e coach
- `src/bots/` bot per livello
- `src/ui/` interfaccia React, carte e tavolo SVG, Danny (la mascotte)
- `src/progress/` storage locale e sincronizzazione su GitHub (branch `data`)
- `content/` lezioni e scenari
- `data/` tabelle generate dagli script in `scripts/` (committate nel repo)
- `docs/` design system e immagini di riferimento

## Deploy

Ogni push su `main` che tocca il sito esegue i test e pubblica su GitHub Pages (`.github/workflows/deploy.yml`). I progressi di gioco vengono scritti dall'app sul branch `data`, che non viene mai pubblicato.
