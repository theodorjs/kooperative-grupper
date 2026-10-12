# Guide for ansatte

`Klassekart-en-kort-guide.pdf` er en kort guide (to A4-sider) til lærerne som bruker verktøyet, skrevet for Torderød
skole (torderodskole.no/cc). Den kan deles ut eller legges ut som den er.

## Endre guiden

- Teksten og oppsettet står i `kilde/guide.html`.
- Skjermbildene ligger i `kilde/bilder/`. De er tatt av appen med skolefargene (`?skole=torderod`) og bare
  eksempelnavnene fra `src/data/eksempel.js`. Bruk aldri ekte elevnavn i skjermbilder.
- Lag PDF-en på nytt fra rotmappa:

  ```bash
  node docs/guide/kilde/lag-pdf.mjs
  ```

  Skriptet trenger Playwright med Chromium, som ikke er en del av appen. Installer det først med
  `npm install --no-save playwright` og `npx playwright install chromium`. Sjekk at guiden fortsatt er på to sider.
