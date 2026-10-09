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
2. **Klassekart:** verktøyene øverst er samlet i fire grupper: Klassekart, Bordgrupper, Elever og Visning. Dra
   bordgruppene dit de står i rommet. Med **Automatisk orientering** snur gruppene seg sånn at elevene ser mot tavla;
   slår du den av, står alle gruppene rett, parallelt med veggene. **Ordne i rutenett** flytter gruppene tilbake
   til rutenettet. **Layout** viser hvordan pultene står, og der velger du layout for alle gruppene med 2, 3, 4 eller
   5 plasser i klassekartet (for eksempel med eller uten åpning, blokk eller tre på rekke). Nye klassekart får samme
   layout. Dra elever fra listen til plassene, eller trykk **Tilfeldig fordeling**. Klikk på en gruppe for å endre
   nummer og navn, antall plasser, layout for bare den gruppa, retning eller plassnummerering. Elevene blir sittende
   på plassnummeret sitt når layouten byttes. **Vis gruppenavn** slår navnene på kartet av og på. En låst elev
   blir sittende ved tilfeldig fordeling. Navnene på pultene leses fra elevens side, men snus hvis de ellers ville stått
   opp ned på kartet; stolen viser hvilken vei eleven sitter.
3. **Denne uka:** rolleoversikten. Plassnummeret er fast, rollen roterer hver mandag. Rotasjonen står stille i
   ferieuker (uker der minst tre av fem skoledager er ferie), og uka etter ferien får elevene nye roller.
4. **Skriv ut** lar deg velge A4 eller A3: stående for klassekartet og liggende for rolleoversikten. I A3 blir
   rolleoversikten skrevet med større skrift. Velg «Lagre som PDF» i utskriftsdialogen for å lage PDF. Noen skrivere
   og nettlesere krever at du også velger A3 i utskriftsdialogen.

5. **Rollene:** biblioteket over samarbeidsrollene, som kort med ikon, navn og beskrivelse. Legg til nye roller,
   endre eller slett dem. Øverst velger du hvilke fire roller som brukes i rotasjonen; navn, ikon og farge vises da i
   «Denne uka» og på klassekartet. En rolle som står i rotasjonen, må byttes ut før den kan slettes.

Standardrollene (fra plakatene) står i `src/logikk/rollebibliotek.js`. Hvordan rollene slås sammen i små grupper,
står i `src/logikk/roller.js`.
Layoutene for bordgruppene står i `src/logikk/maler.js`. Feltet `langArm` holdes i takt med layouten, så eldre
versjoner av appen tegner 5-gruppene riktig.

**Fargevalg:** Under **Innstillinger** velger du lys, mørk eller automatisk (følger maskinen). Valget gjelder bare
den nettleseren, og utskrifter blir alltid lyse. Fargene kommer fra fargesystemet i «Min bruksanvisning» og ligger i
`src/stiler/farger.css`.

**Skolefarger:** På Torderød skoles adresse (https://torderodskole.no/cc/) bruker appen skolens farger: dyp rød for
knapper og lenker, oker som andrefarge og varme, lyse flater. Skolefargene har både lys og mørk variant, så fargevalget
virker som før, og utskrifter blir lyse. Andre steder brukes de vanlige fargene. Legg til `?skole=torderod` i adressen
for å se skolefargene, eller `?skole=ingen` for å slå dem av (valget lagres ikke). Under **Innstillinger → Fargevalg**
står det når skolefargene er i bruk. Skolene står i `src/data/skoletema.js` og i en liten tabell i `index.html`,
fargene i `src/stiler/skoler.css`. Testene sjekker at tabellene er like, at de to mørke blokkene er like, og at teksten
har god nok kontrast.

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

- `src/logikk/` – rene funksjoner uten React, med tester: gruppestørrelser, pultmaler og layouter, orientering,
  tildeling, roller, ukenummer og tolkning av skolerute.
- `scripts/` – henting av ferier fra kommunen (kjøres av GitHub Actions).
- `src/data/` – lagring, eksport/import og operasjoner på appdataene.
- `src/komponenter/` – React-komponentene. Klassekartet tegnes som SVG.
- `src/stiler/` – fargesystemet (`farger.css`), skolefarger (`skoler.css`) og stiler for skjerm og utskrift.

## Publisering på GitHub Pages

Arbeidsflyten `.github/workflows/publiser.yml` tester, henter ferier, bygger og publiserer appen ved hver push til
`main` og hver mandag morgen.
Første gang må Pages slås på: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
Appen ligger på https://theodorjs.github.io/kooperative-grupper/. Torderød skole bygger den samme koden og legger den
på https://torderodskole.no/cc/, der skolefargene slås på automatisk.

`vite.config.js` bruker relativ `base` (`./`), så appen virker uansett hva repoet heter.
