import { nyId } from '../data/id.js';

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

/**
 * Standard plassering: gruppene fordeles jevnt i et rutenett tilpasset
 * rommets form, med fri plass foran tavla. Gruppe 1 står fremst til venstre.
 */
export function standardPosisjoner(antall, rom) {
  if (antall <= 0) return [];
  const { bredde, lengde } = rom;
  const kolonner = Math.max(1, Math.min(antall, Math.round(Math.sqrt((antall * bredde) / lengde))));
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

export function lagBordgruppe({ nummer, storrelse, x, y }) {
  return {
    id: nyId(),
    nummer,
    navn: '',
    storrelse,
    langArm: 'venstre',
    x,
    y,
    rotasjon: null,
    plasser: lagPlasser(storrelse),
  };
}

export function lagBordgrupper(storrelser, rom) {
  const posisjoner = standardPosisjoner(storrelser.length, rom);
  return storrelser.map((storrelse, i) =>
    lagBordgruppe({ nummer: i + 1, storrelse, x: posisjoner[i].x, y: posisjoner[i].y }),
  );
}

/**
 * Endrer størrelsen på én bordgruppe. Elevene på plass 1..n beholdes,
 * plassnummereringen settes tilbake til standard.
 */
export function endreGruppestorrelse(gruppe, storrelse) {
  const ny = gyldigStorrelse(storrelse);
  const etterIndeks = [...gruppe.plasser];
  return { ...gruppe, storrelse: ny, plasser: lagPlasser(ny, etterIndeks) };
}

/** Bytter hvilken arm som er lang i en 5-gruppe. */
export function byttLangArm(gruppe, langArm) {
  return { ...gruppe, langArm, plasser: gruppe.plasser.map((p, i) => ({ ...p, nummer: i + 1 })) };
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

/** Flytter gruppene tilbake til rutenettet, i gruppenummer-rekkefølge. */
export function ordneIRutenett(bordgrupper, rom) {
  const sortert = [...bordgrupper].sort((a, b) => a.nummer - b.nummer);
  const posisjoner = standardPosisjoner(sortert.length, rom);
  return sortert.map((g, i) => ({ ...g, x: posisjoner[i].x, y: posisjoner[i].y, rotasjon: null }));
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
