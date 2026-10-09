import { DATAVERSJON, lagStandarddata, STANDARD_ROM } from './standarddata.js';
import { gyldigStorrelse, lagPlasser, synkLangArm } from '../logikk/grupper.js';
import { gyldigOppsett, standardOppsett, STORRELSER_MED_VALG } from '../logikk/maler.js';
import { normaliserRoller, normaliserRotasjonsroller } from '../logikk/rollebibliotek.js';
import { erGyldigDato, iDag, mandagForDato } from '../logikk/uke.js';

// All data ligger lokalt i nettleseren under én nøkkel. Ingenting sendes ut.
export const LAGRINGSNOKKEL = 'kooperative-grupper';
const RESERVENOKKEL = 'kooperative-grupper-uleselig';

function standardLager() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export class DataFeil extends Error {}

const erObjekt = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const tekst = (v, standard = '') => (typeof v === 'string' ? v : standard);
const tall = (v, standard) => (typeof v === 'number' && Number.isFinite(v) ? v : standard);

/** Klassens layout per gruppestørrelse. Mangler eller ukjent gir standard (slik kartet så ut før). */
function normaliserKlasseoppsett(oppsett) {
  const inn = erObjekt(oppsett) ? oppsett : {};
  return Object.fromEntries(
    STORRELSER_MED_VALG.map((s) => [s, gyldigOppsett(s, inn[s]) ? inn[s] : standardOppsett(s)]),
  );
}

/** Gruppas egen layout, eller null når den følger klassen. */
function normaliserGruppeoppsett(g, storrelse) {
  // Fra før layoutvalget: en 5-gruppe med lang arm til høyre beholder den.
  if (g.oppsett === undefined) return storrelse === 5 && g.langArm === 'hoyre' ? 'lang-hoyre' : null;
  return gyldigOppsett(storrelse, g.oppsett) ? g.oppsett : null;
}

function normaliserGruppe(g, i) {
  const storrelse = gyldigStorrelse(g.storrelse);
  const plasser = lagPlasser(storrelse, Array.isArray(g.plasser) ? g.plasser : []).map((p, j) => {
    const nummer = g.plasser?.[j]?.nummer;
    return { ...p, nummer: Number.isInteger(nummer) && nummer >= 1 && nummer <= storrelse ? nummer : j + 1 };
  });
  // Nummereringen må være en permutasjon av 1..n, ellers brukes standard.
  const numre = new Set(plasser.map((p) => p.nummer));
  if (numre.size !== plasser.length) plasser.forEach((p, j) => { p.nummer = j + 1; });

  return {
    id: tekst(g.id) || `gruppe-${i}`,
    nummer: tall(g.nummer, i + 1),
    navn: tekst(g.navn).slice(0, 40),
    storrelse,
    oppsett: normaliserGruppeoppsett(g, storrelse),
    langArm: 'venstre', // settes etter layouten av synkLangArm
    x: tall(g.x, 1),
    y: tall(g.y, 1),
    rotasjon: typeof g.rotasjon === 'number' && Number.isFinite(g.rotasjon) ? g.rotasjon : null,
    plasser,
  };
}

/**
 * Sjekker og rydder data fra lagring eller import. Kaster DataFeil hvis
 * innholdet ikke er data fra denne appen.
 */
export function normaliser(data) {
  if (!erObjekt(data)) throw new DataFeil('Filen inneholder ikke data fra Kooperative grupper.');
  if (data.versjon !== DATAVERSJON) {
    throw new DataFeil(`Ukjent dataversjon (${String(data.versjon)}). Forventet versjon ${DATAVERSJON}.`);
  }
  if (!Array.isArray(data.elevlister) || !Array.isArray(data.klassekart)) {
    throw new DataFeil('Filen mangler elevlister eller klassekart.');
  }

  const standard = lagStandarddata();
  const inn = erObjekt(data.innstillinger) ? data.innstillinger : {};

  const elevlister = data.elevlister.filter(erObjekt).map((l, i) => ({
    id: tekst(l.id) || `liste-${i}`,
    navn: tekst(l.navn, 'Elevliste'),
    elever: (Array.isArray(l.elever) ? l.elever : [])
      .filter((e) => erObjekt(e) && typeof e.id === 'string')
      .map((e) => ({ id: e.id, navn: tekst(e.navn) })),
  }));

  const klassekart = data.klassekart.filter(erObjekt).map((k, i) =>
    synkLangArm({
      id: tekst(k.id) || `kart-${i}`,
      navn: tekst(k.navn, 'Klassekart'),
      elevlisteId: tekst(k.elevlisteId),
      opprettet: erGyldigDato(k.opprettet) ? k.opprettet : iDag(),
      visGruppenavn: k.visGruppenavn !== false,
      oppsett: normaliserKlasseoppsett(k.oppsett),
      bordgrupper: (Array.isArray(k.bordgrupper) ? k.bordgrupper : []).filter(erObjekt).map(normaliserGruppe),
    }),
  );

  const rom = erObjekt(inn.rom) ? inn.rom : {};
  const ferier = (Array.isArray(inn.ferier) ? inn.ferier : [])
    .filter((f) => erObjekt(f) && erGyldigDato(f.fra) && erGyldigDato(f.til))
    .map((f, i) => ({
      id: tekst(f.id) || `ferie-${i}`,
      navn: tekst(f.navn, 'Ferie'),
      fra: f.fra,
      til: f.til,
      ...(typeof f.kilde === 'string' && f.kilde ? { kilde: f.kilde } : {}),
    }));
  const ferieimport = erObjekt(inn.ferieimport) ? inn.ferieimport : {};

  const finnes = (liste, id) => liste.some((x) => x.id === id);
  const roller = normaliserRoller(data.roller);

  return {
    versjon: DATAVERSJON,
    elevlister,
    klassekart,
    roller,
    innstillinger: {
      aktivElevlisteId: finnes(elevlister, inn.aktivElevlisteId) ? inn.aktivElevlisteId : elevlister[0]?.id ?? null,
      aktivtKlassekartId: finnes(klassekart, inn.aktivtKlassekartId) ? inn.aktivtKlassekartId : null,
      onsketGruppestorrelse: gyldigStorrelse(inn.onsketGruppestorrelse ?? 4),
      rotasjonStart: erGyldigDato(inn.rotasjonStart)
        ? mandagForDato(inn.rotasjonStart)
        : standard.innstillinger.rotasjonStart,
      rotasjonsroller: normaliserRotasjonsroller(inn.rotasjonsroller, roller),
      ferier,
      ferieimport: {
        aktiv: ferieimport.aktiv !== false,
        hentet: erGyldigDato(ferieimport.hentet) ? ferieimport.hentet : null,
      },
      rom: {
        bredde: Math.max(2, tall(rom.bredde, STANDARD_ROM.bredde)),
        lengde: Math.max(2, tall(rom.lengde, STANDARD_ROM.lengde)),
      },
    },
  };
}

/**
 * Leser lagrede data. Er innholdet uleselig, tas en kopi av råteksten før
 * appen starter med tomme data, slik at ingenting overskrives ugjenkallelig.
 */
export function lesData(lager = standardLager()) {
  if (!lager) return lagStandarddata();
  const raa = lager.getItem(LAGRINGSNOKKEL);
  if (!raa) return lagStandarddata();
  try {
    return normaliser(JSON.parse(raa));
  } catch {
    try {
      lager.setItem(RESERVENOKKEL, raa);
    } catch {
      // Ikke plass til reservekopi; data i hovednøkkelen blir likevel stående til neste lagring.
    }
    return lagStandarddata();
  }
}

export function skrivData(data, lager = standardLager()) {
  if (!lager) return false;
  try {
    lager.setItem(LAGRINGSNOKKEL, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function eksportfilnavn(dato = iDag()) {
  return `kooperative-grupper-${dato}.json`;
}

/** Laster ned alle data som en JSON-fil. Skjer helt lokalt i nettleseren. */
export function lastNedData(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const lenke = document.createElement('a');
  lenke.href = url;
  lenke.download = eksportfilnavn();
  document.body.appendChild(lenke);
  lenke.click();
  lenke.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function tolkImport(tekstinnhold) {
  let parsed;
  try {
    parsed = JSON.parse(tekstinnhold);
  } catch {
    throw new DataFeil('Filen er ikke en gyldig JSON-fil.');
  }
  return normaliser(parsed);
}
