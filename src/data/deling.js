// Deling av én klasse med en kollega, via delingsmenyen på iPad (AirDrop).
// Fila lages og deles helt lokalt; appen sender ingenting over nettet selv.

import { DATAVERSJON } from './standarddata.js';
import { klassekartForListe } from './operasjoner.js';
import { iDag } from '../logikk/uke.js';

// Merker fila som én delt klasse, så importen ikke behandler den som en backup.
export const KLASSEFIL = 'klasse';

/** Klassenavnet som filnavn: små bokstaver, a–z, 0–9 og bindestrek. */
export function filnavnDel(navn) {
  const del = String(navn ?? '')
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .replace(/å/g, 'a')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');
  return del || 'klasse';
}

export function delingsfilnavn(klassenavn, dato = iDag()) {
  return `kooperative-grupper-${filnavnDel(klassenavn)}-${dato}.json`;
}

/**
 * Én klasse (elevlista og klassekartene som hører til) i det vanlige
 * dataformatet. Rollebiblioteket følger med, så fila kan leses som vanlig.
 */
export function klasseTilDeling(data, listeId) {
  const liste = data.elevlister.find((l) => l.id === listeId);
  if (!liste) return null;
  return {
    versjon: DATAVERSJON,
    innhold: KLASSEFIL,
    elevlister: [liste],
    klassekart: klassekartForListe(data, listeId),
    roller: data.roller,
    innstillinger: {
      rom: data.innstillinger.rom,
      rotasjonsroller: data.innstillinger.rotasjonsroller,
    },
  };
}

/**
 * Åpner delingsmenyen med fila, eller laster den ned når menyen ikke kan
 * brukes. share() må kalles før første await, ellers mister Safari
 * tillatelsen fra trykket. Bare fila sendes med: tittel og tekst ville blitt
 * egne elementer i AirDrop. Gir 'delt', 'avbrutt' eller 'lastet-ned'.
 */
export async function delEllerLastNed(fil, { nav = globalThis.navigator, lastNed }) {
  let kanDele = false;
  try {
    kanDele = typeof nav?.share === 'function' && nav.canShare?.({ files: [fil] }) === true;
  } catch {
    kanDele = false;
  }
  if (!kanDele) {
    lastNed(fil);
    return 'lastet-ned';
  }
  try {
    await nav.share({ files: [fil] });
    return 'delt';
  } catch (feil) {
    // Avbrutt av brukeren, eller et dobbelttrykk mens menyen er åpen.
    if (feil?.name === 'AbortError' || feil?.name === 'InvalidStateError') return 'avbrutt';
    // Chrome og Edge sier ja i canShare, men avviser JSON-filer i share().
    lastNed(fil);
    return 'lastet-ned';
  }
}
