# cams-eleven: istruzioni per Claude

Palestra personale di carte (Texas Hold'em, poi blackjack con conteggio e poker all'italiana) per CAM.
La fonte di verità è `SPEC.md`: leggila prima di cambiare qualcosa e aggiornala a ogni fase.

## Regole del progetto
- Interfaccia in italiano; termini tecnici e nomi delle tab in inglese (Play, Training, Lessons, Progress; fold, call, raise, pot odds…).
- Numeri in formato europeo: usa sempre `src/ui/format.ts`.
- Nessun numero di strategia a memoria: ogni probabilità o soglia citata ha uno script in `scripts/` e un test.
- Il sito non chiama mai Claude o altre API. Il token GitHub vive solo nel localStorage.
- Commenti nel codice in italiano. Commit chiari, uno per argomento.

## Lavoro sull'interfaccia
1. Prima di toccare la UI: `sh scripts/setup-skills.sh` (scarica le skill impeccable e apple-design in `.claude/skills/`).
2. Usa la skill **impeccable** (craft-floor prima di ogni modifica, `detect` alla fine) e **apple-design** per le regole di iPhone (tab bar, touch target 44 pt, safe area, contrasti).
3. Design system: `docs/design-system.md` e `src/ui/styles/tokens.css`. I contrasti sono testati in `tests/ui/contrast.test.ts`, la simmetria dei semi in `tests/ui/suits.test.ts`.
4. Verifica guardando il risultato: build, `npx vite preview`, screenshot a 390×844 (iPhone), 375×667 (iPhone SE) e desktop.

## Comandi
- `npm test` · `npm run typecheck` · `npm run build`
- Deploy automatico su GitHub Pages da `main` (`.github/workflows/deploy.yml`). I progressi stanno sul branch `data`.
