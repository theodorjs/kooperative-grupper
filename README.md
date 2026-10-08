# Kooperative Grupper

Et verktøy for å organisere klassen i grupper med kooperative roller.

Nettsiden lager klassekart, fordeler elever på plasser og viser hvem som har hvilken samarbeidsrolle denne uka.
Klassekart og rolleoversikt kan skrives ut eller lagres som PDF.

## Personvern

- Elevnavn ligger aldri i koden eller i repoet. Elevlisten limes inn i appen og lagres bare i nettleseren
  (`localStorage`).
- Appen sender ingenting over nettet: ingen analyse, ingen eksterne fonter, ingen API-kall.
- Under **Innstillinger** kan du laste ned alle data som en JSON-fil (sikkerhetskopi) og importere dem i en annen
  nettleser. Filen inneholder elevnavn – ikke legg den i repoet. `.gitignore` stopper filer med standardnavnet
  `kooperative-grupper-*.json`.

## Bruk

1. **Første oppstart:** lim inn elevlisten, ett navn per linje. Appen lager et klassekart med grupper etter ønsket
   gruppestørrelse (standard 4; 21 elever gir 3 grupper med 4 og 3 med 3).
2. **Klassekart:** dra bordgruppene dit de står i rommet. De snur seg automatisk mot tavla. Dra elever fra listen til
   plassene, eller trykk **Tilfeldig fordeling**. Klikk på en gruppe for å endre nummer og navn, antall plasser, lang
   arm (5-grupper), retning eller plassnummerering. **Vis gruppenavn** slår navnene på kartet av og på. En låst elev
   blir sittende ved tilfeldig fordeling. Navnene på pultene leses fra elevens side, men snus hvis de ellers ville stått
   opp ned på kartet; stolen viser hvilken vei eleven sitter.
3. **Denne uka:** rolleoversikten. Plassnummeret er fast, rollen roterer hver mandag. Rotasjonen står stille i
   ferieuker (uker der minst tre av fem skoledager er ferie), og uka etter ferien får elevene nye roller.
4. **Skriv ut** gir A4 stående for klassekartet og A4 liggende for rolleoversikten. Velg «Lagre som PDF» i
   utskriftsdialogen for å lage PDF.

Rollenavn, farger og hvordan roller slås sammen i små grupper står i `src/logikk/roller.js`.

**Fargevalg:** Under **Innstillinger** velger du lys, mørk eller automatisk (følger maskinen). Valget gjelder bare
den nettleseren, og utskrifter blir alltid lyse. Fargene kommer fra fargesystemet i «Min bruksanvisning» og ligger i
`src/stiler/farger.css`.

## Ferier fra skoleruta til Moss kommune

Feriene hentes automatisk fra
[skoleruta til Moss kommune](https://www.moss.kommune.no/alle-tjenester/skole-og-barnehage/skole-og-utdanning/skolearet-og-permisjon/skolerute/).
Nettleseren kontakter aldri kommunen: GitHub Actions henter siden hver gang nettsiden publiseres og hver mandag
morgen, tolker feriene (`scripts/hent-ferier.mjs`) og legger dem i `ferier-moss.json` ved siden av appen. Appen leser
den fila fra sin egen adresse.

- Under **Innstillinger → Ferier** ser du feriene, når de sist ble hentet, og kan slå importen av. Egne ferier kan
  legges inn i tillegg.
- Klarer ikke jobben å hente eller tolke siden, brukes feriene fra forrige publisering, og det står en advarsel
  («Ferieimport») i loggen for kjøringen under **Actions**.
- For å teste tolkningen lokalt: lagre siden fra nettleseren og kjør
  `node scripts/hent-ferier.mjs --fil skolerute.html`. Uten `--fil` hentes siden direkte.

## Utvikling

```bash
npm install
npm run dev      # utviklingsserver
npm test         # enhetstester (Vitest)
npm run build    # bygger til dist/
```

Kildekoden er organisert slik:

- `src/logikk/` – rene funksjoner uten React, med tester: gruppestørrelser, pultmaler, orientering, tildeling,
  roller, ukenummer og tolkning av skolerute.
- `scripts/` – henting av ferier fra kommunen (kjøres av GitHub Actions).
- `src/data/` – lagring, eksport/import og operasjoner på appdataene.
- `src/komponenter/` – React-komponentene. Klassekartet tegnes som SVG.
- `src/stiler/` – fargesystemet (`farger.css`) og stiler for skjerm og utskrift.

## Publisering på GitHub Pages

Arbeidsflyten `.github/workflows/publiser.yml` tester, henter ferier, bygger og publiserer appen ved hver push til
`main` og hver mandag morgen.
Første gang må Pages slås på: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
Appen ligger på https://theodorjs.github.io/kooperative-grupper/.

`vite.config.js` bruker relativ `base` (`./`), så appen virker uansett hva repoet heter.
