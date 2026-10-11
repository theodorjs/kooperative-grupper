// Eksempelklassen på startsiden. Navnene er blant de vanligste fornavnene på
// barn født i Norge i 2025 (SSB), ikke ekte elever. Eksempelet lagres aldri.

import { tilfeldigFordeling } from '../logikk/tildeling.js';
import { iDag } from '../logikk/uke.js';
import { aktivElevliste, aktivtKlassekart, oppdaterKlassekart, opprettElevliste } from './operasjoner.js';
import { lagStandarddata } from './standarddata.js';

export const EKSEMPELKLASSE = 'Eksempelklasse';

// Åtte jentenavn og sju guttenavn fra topp ti i 2025, annenhver.
export const EKSEMPELNAVN = [
  'Emma',
  'Noah',
  'Olivia',
  'Jakob',
  'Nora',
  'Lucas',
  'Sofie',
  'Emil',
  'Leah',
  'Oskar',
  'Ella',
  'William',
  'Frida',
  'Elias',
  'Ellinor',
];

/** Enkel tallrekke med frø, så eksempelet ser likt ut hver gang. */
function fastTilfeldig(fro) {
  let t = fro;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Et mindre rom enn standard, så de fire gruppene fyller forhåndsvisningen.
const EKSEMPELROM = { bredde: 7, lengde: 6.5 };

/** Komplette appdata med eksempelklassen, elevene fordelt på plassene. */
export function lagEksempeldata(dato = iDag()) {
  const tom = lagStandarddata(dato);
  const start = { ...tom, innstillinger: { ...tom.innstillinger, rom: { ...EKSEMPELROM } } };
  const data = opprettElevliste(start, EKSEMPELKLASSE, EKSEMPELNAVN, dato);
  const kart = aktivtKlassekart(data);
  const ider = aktivElevliste(data).elever.map((e) => e.id);
  return oppdaterKlassekart(data, kart.id, (k) => tilfeldigFordeling(k, ider, fastTilfeldig(7)));
}
