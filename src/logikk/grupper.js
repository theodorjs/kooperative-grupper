import { nyId } from '../data/id.js';
import { effektivtOppsett, gyldigOppsett, lagMal, pultHalvmal } from './maler.js';
import { gruppeRotasjon, lokalTilRom, normaliserVinkel } from './orientering.js';

export const MIN_GRUPPESTORRELSE = 1;
export const MAKS_GRUPPESTORRELSE = 5;

export function gyldigStorrelse(storrelse) {
  const n = Math.round(Number(storrelse));
  if (!Number.isFinite(n)) return 4;
  return Math.min(MAKS_GRUPPESTORRELSE, Math.max(MIN_GRUPPESTORRELSE, n));
}

/**
 * Gruppestørrelser etter prinsippet "flest mulig grupper med ønsket størrelse,
 * og noen med én mindre når det trengs":
 *   G = ceil(N / S), antall små grupper = S·G − N, resten får størrelse S.
 *
 * Når det er så få elever at formelen ville krevd grupper som er mer enn én
 * mindre (f.eks. 5 elever og S = 4), fordeles elevene så jevnt som mulig på
 * de G gruppene. Det gir samme resultat som formelen i alle vanlige tilfeller.
 */
export function beregnGruppestorrelser(antallElever, onsket) {
  const n = Math.max(0, Math.floor(antallElever));
  if (n === 0) return [];
  const s = gyldigStorrelse(onsket);
  const g = Math.ceil(n / s);
  const stor = Math.ceil(n / g);
  const antallStore = n - (stor - 1) * g;
  return Array.from({ length: g }, (_, i) => (i < antallStore ? stor : stor - 1));
}

export function antallPlasser(klassekart) {
  return klassekart ? klassekart.bordgrupper.reduce((sum, g) => sum + g.plasser.length, 0) : 0;
}

export function elevordForm(n) {
  return n === 1 ? 'elev' : 'elever';
}

/** Tekst om avvik mellom elever og plasser, eller null når det går opp. */
export function beskrivAvvik(antallElever, plasser) {
  if (antallElever > plasser) {
    const d = antallElever - plasser;
    return `${d} ${elevordForm(d)} uten plass`;
  }
  if (plasser > antallElever) {
    const d = plasser - antallElever;
    return `${d} ${d === 1 ? 'tom plass' : 'tomme plasser'}`;
  }
  return null;
}

const KLARING = 0.3; // minste plass mellom gruppene i en rad, i meter

/** Bredden i meter til den bredeste gruppa, med layouten hver gruppe har. */
export function bredesteGruppe(bordgrupper, kart) {
  return Math.max(0, ...bordgrupper.map((g) => lagMal(g.storrelse, effektivtOppsett(g, kart)).bredde));
}

/**
 * Standard plassering: gruppene fordeles jevnt i et rutenett tilpasset
 * rommets form, med fri plass foran tavla. Gruppe 1 står fremst til venstre.
 * Med `bredeste` (meter) får rutenettet aldri flere kolonner enn at den
 * bredeste gruppa får plass, f.eks. tre pulter på rekke.
 */
export function standardPosisjoner(antall, rom, bredeste = 0) {
  if (antall <= 0) return [];
  const { bredde, lengde } = rom;
  const etterForm = Math.round(Math.sqrt((antall * bredde) / lengde));
  const etterBredde = Math.floor(bredde / (bredeste + KLARING));
  const kolonner = Math.max(1, Math.min(antall, etterForm, etterBredde));
  const rader = Math.ceil(antall / kolonner);

  const fremst = Math.min(1.8, lengde * 0.18);
  const bakerst = lengde - Math.min(0.5, lengde * 0.05);
  const radhoyde = (bakerst - fremst) / rader;
  const kolonnebredde = bredde / kolonner;

  const posisjoner = [];
  for (let rad = 0; rad < rader; rad += 1) {
    const iRaden = Math.min(kolonner, antall - rad * kolonner);
    for (let kol = 0; kol < iRaden; kol += 1) {
      posisjoner.push({
        x: bredde / 2 + (kol - (iRaden - 1) / 2) * kolonnebredde,
        y: fremst + (rad + 0.5) * radhoyde,
      });
    }
  }
  return posisjoner;
}

/** Nye plasser for en gruppe. Elever og låser beholdes for plasser som finnes fortsatt. */
export function lagPlasser(storrelse, gamle = []) {
  return Array.from({ length: storrelse }, (_, i) => ({
    nummer: i + 1,
    elevId: gamle[i]?.elevId ?? null,
    last: Boolean(gamle[i]?.elevId && gamle[i]?.last),
  }));
}

// oppsett: null betyr at gruppa har klassens layout for sin størrelse (se maler.js).
// rotasjon: null betyr automatisk orientering mot tavla.
export function lagBordgruppe({ nummer, storrelse, x, y, rotasjon = null }) {
  return {
    id: nyId(),
    nummer,
    navn: '',
    storrelse,
    oppsett: null,
    langArm: 'venstre',
    x,
    y,
    rotasjon,
    plasser: lagPlasser(storrelse),
  };
}

/**
 * Nye grupper for klassekartet `kart` (valgfritt): de får klassens layout,
 * og står rett hvis ingen av gruppene i kartet har automatisk orientering.
 */
export function lagBordgrupper(storrelser, rom, kart = null) {
  const nye = storrelser.map((storrelse) => ({ storrelse, oppsett: null }));
  const posisjoner = standardPosisjoner(storrelser.length, rom, bredesteGruppe(nye, kart));
  const rotasjon = rotasjonForNyGruppe(kart?.bordgrupper ?? []);
  return storrelser.map((storrelse, i) =>
    lagBordgruppe({ nummer: i + 1, storrelse, x: posisjoner[i].x, y: posisjoner[i].y, rotasjon }),
  );
}

/**
 * Pultene i en gruppe som rektangler i rommet, med layouten og retningen
 * gruppa har: midtpunkt, halv bredde og dybde (pluss halve `klaring`) og
 * aksene til gruppa.
 */
function pultflater(gruppe, kart, rom, klaring) {
  const rotasjon = gruppeRotasjon(gruppe, rom);
  const v = (rotasjon * Math.PI) / 180;
  const akser = [
    { x: Math.cos(v), y: Math.sin(v) },
    { x: -Math.sin(v), y: Math.cos(v) },
  ];
  return lagMal(gruppe.storrelse, effektivtOppsett(gruppe, kart)).pulter.map((pult) => {
    const halv = pultHalvmal(pult.rotasjon);
    return { ...lokalTilRom(pult, gruppe, rotasjon), halv: [halv.x + klaring / 2, halv.y + klaring / 2], akser };
  });
}

/** Om to roterte rektangler overlapper: det gjør de når ingen av aksene deres skiller dem. */
function flaterOverlapper(a, b) {
  const prikk = (p, q) => p.x * q.x + p.y * q.y;
  const radius = (f, u) => f.halv[0] * Math.abs(prikk(f.akser[0], u)) + f.halv[1] * Math.abs(prikk(f.akser[1], u));
  const avstand = { x: b.x - a.x, y: b.y - a.y };
  return [...a.akser, ...b.akser].every((u) => Math.abs(prikk(avstand, u)) < radius(a, u) + radius(b, u) - 1e-9);
}

const pulterOverlapper = (a, b) => a.some((p) => b.some((q) => flaterOverlapper(p, q)));

/** Om pulter i to ulike bordgrupper står oppå hverandre, med layouten og retningen gruppene har nå. */
export function grupperOverlapper(kart, rom) {
  const grupper = kart.bordgrupper.map((g) => pultflater(g, kart, rom, 0));
  return grupper.some((a, i) => grupper.slice(i + 1).some((b) => pulterOverlapper(a, b)));
}

/**
 * Én ny bordgruppe i kartet, med neste nummer. Den står på neste plass i
 * rutenettet hvis det er ledig der. Ellers prøves de andre plassene i
 * rutenettet og i litt tettere rutenett, bakfra, til gruppa står fritt med
 * litt klaring (eller i det minste uten å overlappe). Er ingen plass ledig,
 * brukes neste plass i rutenettet likevel.
 */
export function nyBordgruppe(kart, storrelse, rom) {
  const antall = kart.bordgrupper.length;
  const bredeste = bredesteGruppe([...kart.bordgrupper, { storrelse, oppsett: null }], kart);
  const rotasjon = rotasjonForNyGruppe(kart.bordgrupper);
  const kandidater = [];
  for (let n = antall + 1; n <= antall + 4; n += 1) kandidater.push(...standardPosisjoner(n, rom, bredeste).reverse());
  const ledig = (klaring) => {
    const andre = kart.bordgrupper.map((g) => pultflater(g, kart, rom, klaring));
    return kandidater.find((pos) => {
      const ny = pultflater({ storrelse, oppsett: null, ...pos, rotasjon }, kart, rom, klaring);
      return !andre.some((pulter) => pulterOverlapper(ny, pulter));
    });
  };
  const pos = ledig(KLARING) ?? ledig(0) ?? kandidater[0];
  const nummer = Math.max(0, ...kart.bordgrupper.map((g) => g.nummer)) + 1;
  return lagBordgruppe({ nummer, storrelse, x: pos.x, y: pos.y, rotasjon });
}

/**
 * Endrer størrelsen på én bordgruppe. Elevene på plass 1..n beholdes,
 * plassnummereringen settes tilbake til standard, og gruppa får klassens
 * layout for den nye størrelsen.
 */
export function endreGruppestorrelse(gruppe, storrelse) {
  const ny = gyldigStorrelse(storrelse);
  const etterIndeks = [...gruppe.plasser];
  return { ...gruppe, storrelse: ny, oppsett: null, plasser: lagPlasser(ny, etterIndeks) };
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

/** Layouten klassen har valgt for en gruppestørrelse. */
export function klassensOppsett(kart, storrelse) {
  return effektivtOppsett({ storrelse, oppsett: null }, kart);
}

/** Om gruppa har en annen layout enn klassens valg for størrelsen. */
export function harEgetOppsett(gruppe, kart) {
  return gyldigOppsett(gruppe.storrelse, gruppe.oppsett) && gruppe.oppsett !== klassensOppsett(kart, gruppe.storrelse);
}

/**
 * Gir én gruppe en egen layout, eller null for å følge klassen. Velges
 * klassens layout, følger gruppa klassen igjen. Plassene endres ikke: alle
 * layoutene nummererer pultene i samme rekkefølge, så elever, låser,
 * plassnumre og roller blir der de er.
 */
export function settGruppeoppsett(gruppe, oppsettId, kart) {
  if (oppsettId !== null && !gyldigOppsett(gruppe.storrelse, oppsettId)) return gruppe;
  const oppsett = oppsettId === klassensOppsett(kart, gruppe.storrelse) ? null : oppsettId;
  return { ...gruppe, oppsett };
}

/**
 * Velger layout for alle grupper med en størrelse i kartet. Grupper med egen
 * layout følger valget også, så alle gruppene med den størrelsen blir like.
 */
export function settKlasseoppsett(kart, storrelse, oppsettId) {
  if (!gyldigOppsett(storrelse, oppsettId)) return kart;
  return {
    ...kart,
    oppsett: { ...kart.oppsett, [storrelse]: oppsettId },
    bordgrupper: kart.bordgrupper.map((g) => (g.storrelse === storrelse ? { ...g, oppsett: null } : g)),
  };
}

/**
 * Gruppestørrelsen som vises på Layout-knappen: 4 hvis kartet har
 * firergrupper, ellers 3, 2 eller 5. Uten grupper vises 4.
 */
export function storrelseForTegning(bordgrupper) {
  return [4, 3, 2, 5].find((s) => bordgrupper.some((g) => g.storrelse === s)) ?? 4;
}

/**
 * Eldre versjoner av appen kjenner bare `langArm` for 5-grupper. Feltet
 * holdes i takt med layouten, så en eldre versjon (som speilet, som kan
 * ligge noen timer etter) tegner den lange armen på riktig side.
 */
export function synkLangArm(kart) {
  return {
    ...kart,
    bordgrupper: kart.bordgrupper.map((g) => ({
      ...g,
      langArm: effektivtOppsett(g, kart) === 'lang-hoyre' ? 'hoyre' : 'venstre',
    })),
  };
}

/** Elevene som blir uten plass hvis gruppa krymper til `storrelse`. */
export function eleverSomMisterPlass(gruppe, storrelse) {
  return gruppe.plasser.slice(storrelse).map((p) => p.elevId).filter(Boolean);
}

/** Navnet som vises på kartet: eget navn hvis læreren har gitt ett, ellers "Gruppe 3". */
export function gruppenavn(gruppe) {
  return gruppe.navn?.trim() || `Gruppe ${gruppe.nummer}`;
}

/** Kort variant til lister: eget navn eller "Gr. 3". */
export function kortGruppenavn(gruppe) {
  return gruppe.navn?.trim() || `Gr. ${gruppe.nummer}`;
}

/**
 * Gir en gruppe et nytt nummer. Har en annen gruppe nummeret fra før, bytter
 * de to nummer, slik at alle numrene fortsatt er ulike.
 */
export function settGruppenummer(bordgrupper, gruppeId, nummer) {
  const gruppe = bordgrupper.find((g) => g.id === gruppeId);
  if (!gruppe) return bordgrupper;
  const nytt = Math.min(bordgrupper.length, Math.max(1, Math.round(nummer)));
  return bordgrupper.map((g) => {
    if (g.id === gruppeId) return { ...g, nummer: nytt };
    if (g.nummer === nytt) return { ...g, nummer: gruppe.nummer };
    return g;
  });
}

/** Setter gruppenummer 1, 2, 3 ... i eksisterende rekkefølge. */
export function nummererGrupper(bordgrupper) {
  return [...bordgrupper]
    .sort((a, b) => a.nummer - b.nummer)
    .map((g, i) => ({ ...g, nummer: i + 1 }));
}

/**
 * Flytter gruppene tilbake til rutenettet, i gruppenummer-rekkefølge.
 * Grupper med automatisk orientering beholder den, de andre settes rett.
 * `kart` gir layouten til gruppene, så rutenettet blir bredt nok.
 */
export function ordneIRutenett(bordgrupper, rom, kart = null) {
  const sortert = [...bordgrupper].sort((a, b) => a.nummer - b.nummer);
  const posisjoner = standardPosisjoner(sortert.length, rom, bredesteGruppe(sortert, kart));
  return sortert.map((g, i) => ({
    ...g,
    x: posisjoner[i].x,
    y: posisjoner[i].y,
    rotasjon: g.rotasjon === null ? null : 0,
  }));
}

/**
 * Om noen bordgrupper overlapper nå, men ikke etter «Ordne i rutenett».
 * Da kan appen foreslå å ordne dem (f.eks. etter at klassen har fått en
 * bredere layout). Overlapper de også i rutenettet, hjelper det ikke.
 */
export function rutenettGirPlass(kart, rom) {
  if (!grupperOverlapper(kart, rom)) return false;
  return !grupperOverlapper({ ...kart, bordgrupper: ordneIRutenett(kart.bordgrupper, rom, kart) }, rom);
}

// ---------------------------------------------------------------------------
// Automatisk orientering for hele klasserommet (rotasjon null = automatisk)
// ---------------------------------------------------------------------------

/** 'alle', 'ingen' eller 'noen' av gruppene har automatisk orientering; 'tom' uten grupper. */
export function automatiskOrientering(bordgrupper) {
  if (bordgrupper.length === 0) return 'tom';
  const automatiske = bordgrupper.filter((g) => g.rotasjon === null).length;
  if (automatiske === bordgrupper.length) return 'alle';
  return automatiske === 0 ? 'ingen' : 'noen';
}

/** Slår automatisk orientering på for alle grupper, eller av: da står alle rett, parallelt med veggene. */
export function settAutomatiskOrientering(bordgrupper, pa) {
  return bordgrupper.map((g) => ({ ...g, rotasjon: pa ? null : 0 }));
}

/** Grupper som er dreid for hånd til en annen retning enn rett. */
export function antallMedEgenRetning(bordgrupper) {
  return bordgrupper.filter((g) => g.rotasjon !== null && normaliserVinkel(g.rotasjon) !== 0).length;
}

/** Nye grupper står rett når ingen av de andre har automatisk orientering. */
export function rotasjonForNyGruppe(bordgrupper) {
  return automatiskOrientering(bordgrupper) === 'ingen' ? 0 : null;
}

export function begrensTilRom({ x, y }, rom) {
  return {
    x: Math.min(rom.bredde, Math.max(0, x)),
    y: Math.min(rom.lengde, Math.max(0, y)),
  };
}

/**
 * Bruker en ny nummerering: `rekkefolge` er plassindeksene i den
 * rekkefølgen læreren klikket dem (første klikk blir plass 1).
 */
export function nyNummerering(gruppe, rekkefolge) {
  const plasser = gruppe.plasser.map((p) => ({ ...p }));
  rekkefolge.forEach((indeks, i) => {
    plasser[indeks].nummer = i + 1;
  });
  return { ...gruppe, plasser };
}

export function standardNummerering(gruppe) {
  return { ...gruppe, plasser: gruppe.plasser.map((p, i) => ({ ...p, nummer: i + 1 })) };
}
