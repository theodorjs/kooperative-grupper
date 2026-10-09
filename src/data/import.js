// Import fra fil: en klasse fra en kollega eller en backup. Klassene i fila
// legges inn som nye klasser, og resten av dataene blir som før.

import { KLASSEFIL } from './deling.js';
import { nyId } from './id.js';
import { lesJson, normaliser } from './lagring.js';
import { velgElevliste } from './operasjoner.js';
import { begrensTilRom } from '../logikk/grupper.js';

/** Leser fila. erBackup er sann for alle filer som ikke er én delt klasse. */
export function tolkImportfil(tekst) {
  const raa = lesJson(tekst);
  const data = normaliser(raa);
  return { data, erBackup: raa.innhold !== KLASSEFIL };
}

const nokkel = (navn) => navn.trim().toLowerCase();

/** Egne klasser som har samme navn som en klasse i fila. */
function klasserSomErstattes(eksisterende, importert) {
  const navn = new Set(importert.elevlister.map((l) => nokkel(l.navn)));
  return eksisterende.elevlister.filter((l) => navn.has(nokkel(l.navn)));
}

/** Navnene på egne klasser som blir overskrevet av importen. */
export function navnekollisjoner(eksisterende, importert) {
  return [...new Set(klasserSomErstattes(eksisterende, importert).map((l) => l.navn))];
}

/** Kopi av en importert klasse med nye ID-er, så ingenting kolliderer med egne data. */
function kopierKlasse(liste, kart, rom) {
  const elevIder = new Map(liste.elever.map((e) => [e.id, nyId()]));
  const nyListe = { ...liste, id: nyId(), elever: liste.elever.map((e) => ({ ...e, id: elevIder.get(e.id) })) };
  const nyeKart = kart.map((k) => ({
    ...k,
    id: nyId(),
    elevlisteId: nyListe.id,
    bordgrupper: k.bordgrupper.map((g) => ({
      ...g,
      id: nyId(),
      // Grupper utenfor mottakerens rom flyttes inn, så de synes.
      ...begrensTilRom(g, rom),
      plasser: g.plasser.map((p) => {
        const elevId = elevIder.get(p.elevId) ?? null;
        return { ...p, elevId, last: Boolean(elevId && p.last) };
      }),
    })),
  }));
  return { liste: nyListe, kart: nyeKart };
}

/**
 * Legger klassene fra fila inn som nye klasser. En egen klasse med samme
 * navn erstattes, med elever og klassekart, og beholder plassen i lista.
 * Roller, rotasjon, ferier og rom er mottakerens. Klassekart uten elevliste
 * i fila hoppes over. Har mottakeren ingen klasser og fila er en backup,
 * gjenopprettes alt slik det var.
 */
export function slaSammen(eksisterende, importert, { erBackup = false } = {}) {
  if (erBackup && eksisterende.elevlister.length === 0) return importert;

  const rom = eksisterende.innstillinger.rom;
  const nye = importert.elevlister.map((liste) =>
    kopierKlasse(liste, importert.klassekart.filter((k) => k.elevlisteId === liste.id), rom),
  );
  const erstattes = new Set(klasserSomErstattes(eksisterende, importert).map((l) => l.id));

  const ventende = [...nye];
  const elevlister = [];
  for (const l of eksisterende.elevlister) {
    if (!erstattes.has(l.id)) {
      elevlister.push(l);
      continue;
    }
    const i = ventende.findIndex((k) => nokkel(k.liste.navn) === nokkel(l.navn));
    if (i >= 0) elevlister.push(ventende.splice(i, 1)[0].liste);
  }
  elevlister.push(...ventende.map((k) => k.liste));

  const klassekart = [
    ...eksisterende.klassekart.filter((k) => !erstattes.has(k.elevlisteId)),
    ...nye.flatMap((k) => k.kart),
  ];

  const ny = { ...eksisterende, elevlister, klassekart };
  // Den første klassen fra fila blir aktiv, med det nyeste klassekartet.
  return nye.length ? velgElevliste(ny, nye[0].liste.id) : ny;
}

// ---------------------------------------------------------------------------
// Tekster til læreren
// ---------------------------------------------------------------------------

const sitat = (navn) => `«${navn}»`;

function oppramsing(navn) {
  const s = navn.map(sitat);
  return s.length <= 1 ? s.join('') : `${s.slice(0, -1).join(', ')} og ${s.at(-1)}`;
}

/** Spørsmålet som stilles før importen. Advarer når en klasse blir overskrevet. */
export function importsporsmal(eksisterende, importert) {
  const klasser = importert.elevlister;
  const kollisjoner = navnekollisjoner(eksisterende, importert);

  if (kollisjoner.length === 0) {
    if (klasser.length === 1) {
      const antall = importert.klassekart.filter((k) => k.elevlisteId === klasser[0].id).length;
      const kart = antall ? `med ${antall} klassekart` : 'uten klassekart';
      return `Fila inneholder klassen ${sitat(klasser[0].navn)} ${kart}. Den legges inn som en ny klasse.`;
    }
    return `Fila inneholder ${klasser.length} klasser: ${oppramsing(klasser.map((l) => l.navn))}. De legges inn som nye klasser.`;
  }

  const en = kollisjoner.length === 1;
  const deler = [
    en
      ? `Du har allerede en klasse som heter ${sitat(kollisjoner[0])}. Den blir overskrevet av klassen fra fila, med elever og klassekart.`
      : `Du har allerede klasser som heter ${oppramsing(kollisjoner)}. De blir overskrevet av klassene fra fila, med elever og klassekart.`,
  ];
  const brukt = new Set(kollisjoner.map(nokkel));
  const andre = klasser.filter((l) => !brukt.has(nokkel(l.navn))).map((l) => l.navn);
  if (andre.length) {
    deler.push(`${oppramsing(andre)} legges inn som ${andre.length === 1 ? 'ny klasse' : 'nye klasser'}.`);
  }
  deler.push('Vil du fortsette?');
  return deler.join(' ');
}

/** Bekreftelsen etter importen. */
export function importmelding(importert) {
  const navn = importert.elevlister.map((l) => l.navn);
  return navn.length === 1 ? `Klassen ${sitat(navn[0])} er lagt inn.` : `Klassene ${oppramsing(navn)} er lagt inn.`;
}
