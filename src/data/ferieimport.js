// Automatisk import av ferier fra skoleruta til Moss kommune.
//
// Nettleseren henter aldri noe fra kommunen. En GitHub Actions-jobb henter
// skolerute-siden når nettsiden bygges (og én gang i uka), tolker feriene og
// legger dem i `ferier-moss.json` ved siden av appen. Appen leser den fila fra
// sin egen adresse, så ingen data om elevene forlater nettleseren.

import { erGyldigDato } from '../logikk/uke.js';

export const FERIEKILDE = {
  id: 'moss',
  navn: 'Moss kommune',
  url: 'https://www.moss.kommune.no/alle-tjenester/skole-og-barnehage/skole-og-utdanning/skolearet-og-permisjon/skolerute/',
  fil: 'ferier-moss.json',
};

/** Sjekker innholdet i feriefila. Returnerer null hvis den er tom eller ugyldig. */
export function tolkFeriefil(innhold) {
  if (!innhold || typeof innhold !== 'object' || !erGyldigDato(innhold.hentet) || !Array.isArray(innhold.ferier)) {
    return null;
  }
  const ferier = innhold.ferier
    .filter((f) => f && erGyldigDato(f.fra) && erGyldigDato(f.til) && f.fra <= f.til)
    .map((f) => ({ navn: typeof f.navn === 'string' && f.navn ? f.navn : 'Ferie', fra: f.fra, til: f.til }));
  return { hentet: innhold.hentet, ferier };
}

/** Henter feriefila fra appens egen adresse. Gir null hvis det ikke går. */
export async function hentImporterteFerier() {
  try {
    const svar = await fetch(`./${FERIEKILDE.fil}`, { cache: 'no-cache' });
    if (!svar.ok) return null;
    return tolkFeriefil(await svar.json());
  } catch {
    return null;
  }
}

const erImportert = (f) => f.kilde === FERIEKILDE.id;

/**
 * Erstatter tidligere importerte ferier med de nye. Ferier læreren har lagt
 * inn selv, blir stående. Returnerer samme objekt hvis ingenting er endret.
 */
export function brukImporterteFerier(data, { hentet, ferier }) {
  const inn = data.innstillinger;
  if (!inn.ferieimport.aktiv) return data;
  const importerte = ferier.map((f) => ({
    id: `${FERIEKILDE.id}-${f.fra}-${f.til}`,
    navn: f.navn,
    fra: f.fra,
    til: f.til,
    kilde: FERIEKILDE.id,
  }));
  const egne = inn.ferier.filter((f) => !erImportert(f));
  const uendret =
    inn.ferieimport.hentet === hentet &&
    JSON.stringify(inn.ferier.filter(erImportert)) === JSON.stringify(importerte);
  if (uendret) return data;
  return {
    ...data,
    innstillinger: {
      ...inn,
      ferier: [...egne, ...importerte],
      ferieimport: { ...inn.ferieimport, hentet },
    },
  };
}

/** Slår importen av (og fjerner importerte ferier) eller på igjen. */
export function settFerieimport(data, aktiv) {
  const inn = data.innstillinger;
  return {
    ...data,
    innstillinger: {
      ...inn,
      ferier: aktiv ? inn.ferier : inn.ferier.filter((f) => !erImportert(f)),
      ferieimport: { aktiv, hentet: aktiv ? inn.ferieimport.hentet : null },
    },
  };
}
