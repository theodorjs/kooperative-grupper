import { erGyldigDato, fraDagnummer, leggTilDager, mandagForDato, tilDagnummer } from './uke.js';

// ---------------------------------------------------------------------------
// Konfigurasjon. Endre her for å endre rollenavn, farger eller rekkefølge.
// ---------------------------------------------------------------------------

export const ROLLER = {
  1: { nummer: 1, navn: 'Materialforvalter', tillegg: '(og ordenselev)', farge: '#2E7D32' },
  2: { nummer: 2, navn: 'Oppmuntrer', tillegg: '', farge: '#E65100' },
  3: { nummer: 3, navn: 'Reporter', tillegg: '', farge: '#1565C0' },
  4: { nummer: 4, navn: 'Sjekker', tillegg: '', farge: '#6A1B9A' },
};

export const ROLLENUMRE = [1, 2, 3, 4];

/**
 * Rolleposisjoner per gruppestørrelse. Hver posisjon er en liste med roller,
 * slik at sammenslåtte roller (dobbeltroller) roterer som én posisjon.
 */
export const ROLLEPOSISJONER = {
  1: [[1, 2, 3, 4]],                 // Alle roller
  2: [[1, 3], [2, 4]],               // Materialforvalter og reporter / Oppmuntrer og sjekker
  3: [[1], [2, 4], [3]],             // Oppmuntrer og sjekker er én dobbeltrolle
  4: [[1], [2], [3], [4]],
  5: [[1], [2], [3], [4], [2]],      // To elever deler rollen som oppmuntrer
};

// ---------------------------------------------------------------------------
// Ferier
// ---------------------------------------------------------------------------

export function finnFerie(dato, ferier = []) {
  return ferier.find((f) => erGyldigDato(f.fra) && erGyldigDato(f.til) && f.fra <= dato && dato <= f.til) ?? null;
}

const SKOLEDAGER_I_UKA = 5;
const MIN_FERIEDAGER_I_FERIEUKE = 3;

/**
 * Ferien i uka som `dato` ligger i, hvis uka er en ferieuke: minst tre av de
 * fem skoledagene (mandag–fredag) er ferie. Enkeltstående fridager, som
 * 2. påskedag på en mandag, gjør altså ikke uka til en ferieuke.
 */
export function ferieForUke(dato, ferier = []) {
  const mandag = mandagForDato(dato);
  const dager = new Map();
  let feriedager = 0;
  for (let i = 0; i < SKOLEDAGER_I_UKA; i += 1) {
    const ferie = finnFerie(leggTilDager(mandag, i), ferier);
    if (ferie) {
      feriedager += 1;
      dager.set(ferie, (dager.get(ferie) ?? 0) + 1);
    }
  }
  if (feriedager < MIN_FERIEDAGER_I_FERIEUKE) return null;
  return [...dager.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

export function erFerieuke(dato, ferier = []) {
  return ferieForUke(dato, ferier) !== null;
}

/**
 * Rollene rykker videre hver mandag, unntatt i ferieuker. Rotasjonen står
 * altså stille bare i selve ferieuka, og uka etter ferien får nye roller.
 */
function rotererDenneMandagen(mandag, ferier) {
  return !erFerieuke(mandag, ferier);
}

/**
 * Ukeforskyvning k: antall rotasjonssteg fra startmandagen til mandagen i
 * uka som `dato` ligger i. Negativ hvis datoen er før start.
 */
export function ukeforskyvning(rotasjonStart, dato, ferier = []) {
  const start = tilDagnummer(mandagForDato(rotasjonStart));
  const maal = tilDagnummer(mandagForDato(dato));
  const teller = (dagnummer) => rotererDenneMandagen(fraDagnummer(dagnummer), ferier);

  let k = 0;
  if (maal >= start) {
    for (let m = start + 7; m <= maal; m += 7) if (teller(m)) k += 1;
  } else {
    for (let m = maal + 7; m <= start; m += 7) if (teller(m)) k -= 1;
  }
  return k;
}

const mod = (a, n) => ((a % n) + n) % n;

/** Rolleposisjon (0-basert) for plass p i en gruppe med n posisjoner. */
export function rolleposisjon(plassnummer, storrelse, k) {
  const n = ROLLEPOSISJONER[storrelse].length;
  return mod(plassnummer - 1 + k, n);
}

/** Rollene (rollenumre) som plassen har i uke med forskyvning k. */
export function rollerForPlass(plassnummer, storrelse, k) {
  return ROLLEPOSISJONER[storrelse][rolleposisjon(plassnummer, storrelse, k)];
}

/**
 * Finner en ny startmandag slik at forskyvningen for `dato` endres med
 * nøyaktig `steg` (+1 = én uke frem, -1 = én uke tilbake). Ferier tas med i
 * beregningen, så knappen alltid gir ett synlig steg.
 */
export function flyttRotasjonStart(rotasjonStart, dato, ferier, steg) {
  const maal = ukeforskyvning(rotasjonStart, dato, ferier) + steg;
  let start = mandagForDato(rotasjonStart);
  for (let i = 0; i < 520; i += 1) {
    start = leggTilDager(start, -7 * Math.sign(steg));
    if (ukeforskyvning(start, dato, ferier) === maal) return start;
  }
  return rotasjonStart;
}

// ---------------------------------------------------------------------------
// Rolleoversikt
// ---------------------------------------------------------------------------

/**
 * Bygger tabellen: én rad per bordgruppe (sortert etter gruppenummer) og én
 * celle per rolle. En celle kan ha flere elever (to oppmuntrere i 5-grupper).
 */
export function lagRolleoversikt(klassekart, elever, k) {
  const navn = new Map(elever.map((e) => [e.id, e.navn]));
  return [...klassekart.bordgrupper]
    .sort((a, b) => a.nummer - b.nummer)
    .map((gruppe) => {
      const celler = Object.fromEntries(ROLLENUMRE.map((r) => [r, []]));
      const plasser = [...gruppe.plasser].sort((a, b) => a.nummer - b.nummer);
      for (const plass of plasser) {
        const roller = rollerForPlass(plass.nummer, gruppe.storrelse, k);
        for (const rolle of roller) {
          celler[rolle].push({
            plass: plass.nummer,
            elevId: plass.elevId,
            navn: plass.elevId ? navn.get(plass.elevId) ?? null : null,
            flereRoller: roller.length > 1,
          });
        }
      }
      return { gruppeId: gruppe.id, nummer: gruppe.nummer, storrelse: gruppe.storrelse, celler };
    });
}
