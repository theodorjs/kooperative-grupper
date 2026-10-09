// Pultmaler for bordgrupper med 1 til 5 elever.
//
// Koordinater er i meter i gruppens eget system:
//   - "fremover" (mot tavla) er negativ y
//   - "høyre" er positiv x, sett fra en som sitter bakerst og ser mot tavla
//
// Hver pult har et midtpunkt (x, y) og en rotasjon i grader. Rotasjon 0 betyr
// at eleven sitter på baksiden (positiv y) og ser fremover. Rotasjon -90 betyr
// at eleven sitter på høyre side og ser mot venstre, 90 motsatt.
//
// Rekkefølgen i lista er standard plassnummerering: indeks 0 er plass 1.
// Plass 1 er den fremste sidelengs pulten på høyre side, og resten nummereres
// med klokka sett ovenfra med tavla foran. Står pultene på rekke uten noen
// sidelengs, er plass 1 pulten lengst til høyre.

// Pultene er litt større enn ekte pulter (70 × 50 cm), slik at navnene kan
// leses på utskriften. Forholdet 7:5 er det samme.
export const PULT_LANG = 0.84;
export const PULT_KORT = 0.6;

const L = PULT_LANG;
const K = PULT_KORT;
const ARM_X = L - K / 2;

const VENDT_FREM = 0;
const VENDT_MOT_VENSTRE = -90; // eleven sitter til høyre og ser innover
const VENDT_MOT_HOYRE = 90; // eleven sitter til venstre og ser innover

// Layoutene læreren kan velge mellom, per gruppestørrelse. Den første i hver
// liste er standard og er slik gruppene alltid har sett ut. Alle layoutene
// nummererer plassene etter samme regel, så elever, låser og roller blir
// sittende på sitt plassnummer når layouten byttes.
const OPPSETT = {
  1: [
    {
      id: 'enkel',
      navn: 'Enkel',
      beskrivelse: 'Én pult som ser mot tavla.',
      pulter: [{ x: 0, y: 0, rotasjon: VENDT_FREM }],
    },
  ],
  2: [
    {
      id: 'rekke',
      navn: 'Side om side',
      beskrivelse: 'To pulter ved siden av hverandre, og begge elevene ser rett mot tavla.',
      pulter: [
        { x: L / 2, y: 0, rotasjon: VENDT_FREM }, // 1 høyre
        { x: -L / 2, y: 0, rotasjon: VENDT_FREM }, // 2 venstre
      ],
    },
    {
      id: 'mot',
      navn: 'Ansikt til ansikt',
      beskrivelse: 'To pulter kant i kant, og elevene sitter vendt mot hverandre med tavla på siden.',
      pulter: [
        { x: K / 2, y: 0, rotasjon: VENDT_MOT_VENSTRE }, // 1 høyre
        { x: -K / 2, y: 0, rotasjon: VENDT_MOT_HOYRE }, // 2 venstre
      ],
    },
  ],
  3: [
    {
      id: 'tett',
      navn: 'Uten åpning',
      beskrivelse:
        'To elever sitter rett overfor hverandre med pultene inntil hverandre, og den tredje sitter bakerst og ser mot tavla.',
      pulter: [
        { x: K / 2, y: -L / 2, rotasjon: VENDT_MOT_VENSTRE }, // 1 sidelengs høyre
        { x: 0, y: K / 2, rotasjon: VENDT_FREM }, // 2 bakerst
        { x: -K / 2, y: -L / 2, rotasjon: VENDT_MOT_HOYRE }, // 3 sidelengs venstre
      ],
    },
    {
      id: 'apen',
      navn: 'Med åpning',
      beskrivelse:
        'Som firergruppa: to elever sitter overfor hverandre med en åpning mellom pultene, og den tredje sitter bakerst.',
      pulter: [
        { x: ARM_X, y: -L / 2, rotasjon: VENDT_MOT_VENSTRE }, // 1 høyre arm
        { x: 0, y: K / 2, rotasjon: VENDT_FREM }, // 2 bakerst
        { x: -ARM_X, y: -L / 2, rotasjon: VENDT_MOT_HOYRE }, // 3 venstre arm
      ],
    },
    {
      id: 'rekke',
      navn: 'På rekke',
      beskrivelse: 'Tre pulter ved siden av hverandre, og alle ser rett mot tavla.',
      pulter: [
        { x: L, y: 0, rotasjon: VENDT_FREM }, // 1 høyre
        { x: 0, y: 0, rotasjon: VENDT_FREM }, // 2 midten
        { x: -L, y: 0, rotasjon: VENDT_FREM }, // 3 venstre
      ],
    },
  ],
  4: [
    {
      id: 'apen',
      navn: 'Med åpning',
      beskrivelse:
        'De to bakerste ser mot tavla, og de to i armene sitter overfor hverandre med en åpning mellom pultene.',
      pulter: [
        { x: ARM_X, y: -L / 2, rotasjon: VENDT_MOT_VENSTRE }, // 1 høyre arm
        { x: L / 2, y: K / 2, rotasjon: VENDT_FREM }, // 2 bakerst til høyre
        { x: -L / 2, y: K / 2, rotasjon: VENDT_FREM }, // 3 bakerst til venstre
        { x: -ARM_X, y: -L / 2, rotasjon: VENDT_MOT_HOYRE }, // 4 venstre arm
      ],
    },
    {
      id: 'tett',
      navn: 'Uten åpning',
      beskrivelse:
        'Som med åpning, men pultene i armene er skjøvet inntil hverandre, så elevene der sitter nærmere hverandre.',
      pulter: [
        { x: K / 2, y: -L / 2, rotasjon: VENDT_MOT_VENSTRE }, // 1 høyre arm
        { x: L / 2, y: K / 2, rotasjon: VENDT_FREM }, // 2 bakerst til høyre
        { x: -L / 2, y: K / 2, rotasjon: VENDT_FREM }, // 3 bakerst til venstre
        { x: -K / 2, y: -L / 2, rotasjon: VENDT_MOT_HOYRE }, // 4 venstre arm
      ],
    },
    {
      id: 'blokk',
      navn: 'Blokk',
      beskrivelse: 'Fire pulter i en firkant der to og to sitter overfor hverandre, og alle har tavla på siden.',
      pulter: [
        { x: K / 2, y: -L / 2, rotasjon: VENDT_MOT_VENSTRE }, // 1 høyre fremst
        { x: K / 2, y: L / 2, rotasjon: VENDT_MOT_VENSTRE }, // 2 høyre bakerst
        { x: -K / 2, y: L / 2, rotasjon: VENDT_MOT_HOYRE }, // 3 venstre bakerst
        { x: -K / 2, y: -L / 2, rotasjon: VENDT_MOT_HOYRE }, // 4 venstre fremst
      ],
    },
  ],
  5: [
    {
      id: 'lang-venstre',
      navn: 'Lang arm venstre',
      beskrivelse:
        'De to bakerste ser mot tavla, armene sitter overfor hverandre med en åpning mellom, og venstre arm har to pulter.',
      pulter: [
        { x: ARM_X, y: -L / 2, rotasjon: VENDT_MOT_VENSTRE }, // 1 høyre arm
        { x: L / 2, y: K / 2, rotasjon: VENDT_FREM }, // 2 bakerst til høyre
        { x: -L / 2, y: K / 2, rotasjon: VENDT_FREM }, // 3 bakerst til venstre
        { x: -ARM_X, y: -L / 2, rotasjon: VENDT_MOT_HOYRE }, // 4 venstre arm nærmest bakerste rad
        { x: -ARM_X, y: (-3 * L) / 2, rotasjon: VENDT_MOT_HOYRE }, // 5 venstre arm fremst
      ],
    },
    {
      id: 'lang-hoyre',
      navn: 'Lang arm høyre',
      beskrivelse:
        'De to bakerste ser mot tavla, armene sitter overfor hverandre med en åpning mellom, og høyre arm har to pulter.',
      pulter: [
        { x: ARM_X, y: (-3 * L) / 2, rotasjon: VENDT_MOT_VENSTRE }, // 1 høyre arm fremst
        { x: ARM_X, y: -L / 2, rotasjon: VENDT_MOT_VENSTRE }, // 2 høyre arm nærmest bakerste rad
        { x: L / 2, y: K / 2, rotasjon: VENDT_FREM }, // 3 bakerst til høyre
        { x: -L / 2, y: K / 2, rotasjon: VENDT_FREM }, // 4 bakerst til venstre
        { x: -ARM_X, y: -L / 2, rotasjon: VENDT_MOT_HOYRE }, // 5 venstre arm
      ],
    },
    {
      id: 'blokk',
      navn: 'Blokk med ende',
      beskrivelse:
        'Fire pulter i en blokk der to og to sitter overfor hverandre, og den femte sitter bakerst på enden og ser mot tavla.',
      pulter: [
        { x: K / 2, y: (-3 * L) / 2, rotasjon: VENDT_MOT_VENSTRE }, // 1 høyre fremst
        { x: K / 2, y: -L / 2, rotasjon: VENDT_MOT_VENSTRE }, // 2 høyre bakerst
        { x: 0, y: K / 2, rotasjon: VENDT_FREM }, // 3 på enden
        { x: -K / 2, y: -L / 2, rotasjon: VENDT_MOT_HOYRE }, // 4 venstre bakerst
        { x: -K / 2, y: (-3 * L) / 2, rotasjon: VENDT_MOT_HOYRE }, // 5 venstre fremst
      ],
    },
  ],
};

/** Gruppestørrelsene læreren kan velge layout for (1 har bare én). */
export const STORRELSER_MED_VALG = [2, 3, 4, 5];

/** Layoutene for en gruppestørrelse: [{ id, navn, beskrivelse }], standard først. */
export function oppsettFor(storrelse) {
  return (OPPSETT[storrelse] ?? []).map(({ id, navn, beskrivelse }) => ({ id, navn, beskrivelse }));
}

export function gyldigOppsett(storrelse, id) {
  return typeof id === 'string' && Boolean(OPPSETT[storrelse]?.some((o) => o.id === id));
}

export function standardOppsett(storrelse) {
  return OPPSETT[storrelse]?.[0].id ?? null;
}

/** Klassens valg når ingen har valgt: standard for hver størrelse. */
export function standardKlasseoppsett() {
  return Object.fromEntries(STORRELSER_MED_VALG.map((s) => [s, standardOppsett(s)]));
}

export function oppsettnavn(storrelse, id) {
  return OPPSETT[storrelse]?.find((o) => o.id === id)?.navn ?? '';
}

/**
 * Layouten gruppa faktisk har: gruppas eget valg, ellers klassens valg for
 * størrelsen, ellers standard.
 */
export function effektivtOppsett(gruppe, kart) {
  const { storrelse } = gruppe;
  if (gyldigOppsett(storrelse, gruppe.oppsett)) return gruppe.oppsett;
  const klassens = kart?.oppsett?.[storrelse];
  if (gyldigOppsett(storrelse, klassens)) return klassens;
  return standardOppsett(storrelse);
}

function rapulter(storrelse, oppsettId) {
  const valg = OPPSETT[storrelse];
  if (!valg) throw new Error(`Ugyldig gruppestørrelse: ${storrelse}`);
  return (valg.find((o) => o.id === oppsettId) ?? valg[0]).pulter;
}

/** Halve utstrekninger for en pult langs gruppens x- og y-akse. */
export function pultHalvmal(rotasjon) {
  const sidelengs = Math.abs(rotasjon) % 180 === 90;
  return sidelengs ? { x: K / 2, y: L / 2 } : { x: L / 2, y: K / 2 };
}

/**
 * Mal for en bordgruppe, sentrert slik at midtpunktet av pultene er (0, 0).
 * Returnerer pultene i standard nummerrekkefølge og gruppens bredde/høyde.
 * Uten gyldig layout brukes standard for størrelsen.
 */
export function lagMal(storrelse, oppsettId) {
  const pulter = rapulter(storrelse, oppsettId);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of pulter) {
    const h = pultHalvmal(p.rotasjon);
    minX = Math.min(minX, p.x - h.x);
    maxX = Math.max(maxX, p.x + h.x);
    minY = Math.min(minY, p.y - h.y);
    maxY = Math.max(maxY, p.y + h.y);
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const rund = (n) => Math.round(n * 1e6) / 1e6;
  return {
    pulter: pulter.map((p) => ({ x: rund(p.x - cx), y: rund(p.y - cy), rotasjon: p.rotasjon })),
    bredde: rund(maxX - minX),
    hoyde: rund(maxY - minY),
  };
}
