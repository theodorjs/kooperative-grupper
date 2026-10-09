// Import fra fil: en klasse fra en kollega eller en backup. Klassene i fila
// legges inn som nye klasser. Har mottakeren klasser fra før, blir resten av
// dataene som før.

import { KLASSEFIL } from './deling.js';
import { nyId } from './id.js';
import { lesJson, normaliser } from './lagring.js';
import { velgElevliste } from './operasjoner.js';
import { begrensTilRom } from '../logikk/grupper.js';

/**
 * Leser fila. En delt klasse ligger under «klasse» (se klasseTilDeling) og
 * pakkes ut før den sjekkes. erBackup er sann for alle filer som ikke er én
 * delt klasse.
 */
export function tolkImportfil(tekst) {
  const raa = lesJson(tekst);
  const erKlasse = raa?.innhold === KLASSEFIL;
  const kilde = erKlasse && raa.klasse ? { ...raa.klasse, versjon: raa.versjon } : raa;
  return { data: normaliser(kilde), erBackup: !erKlasse };
}

const nokkel = (navn) => navn.trim().toLowerCase();

/**
 * Kobler klassene i fila til egne klasser med samme navn, én til én: hver
 * klasse i fila erstatter høyst én egen klasse, den første ledige med samme
 * navn i lista. Gir den egne klassen for hver klasse i fila, eller null.
 */
function koblinger(eksisterende, importert) {
  const ledige = [...eksisterende.elevlister];
  return importert.elevlister.map((l) => {
    const i = ledige.findIndex((e) => nokkel(e.navn) === nokkel(l.navn));
    return i >= 0 ? ledige.splice(i, 1)[0] : null;
  });
}

/** Egne klasser som blir overskrevet, i samme rekkefølge som i lista. */
const klasserSomErstattes = (eksisterende, par) => eksisterende.elevlister.filter((l) => par.includes(l));

/** Navnene på egne klasser som blir overskrevet av importen, ett per klasse. */
export function navnekollisjoner(eksisterende, importert) {
  return klasserSomErstattes(eksisterende, koblinger(eksisterende, importert)).map((l) => l.navn);
}

/** Har mottakeren ingen klasser og fila er en backup, gjenopprettes alt slik det var. */
const gjenopprettes = (eksisterende, erBackup) => erBackup && eksisterende.elevlister.length === 0;

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
 * Mottakeren uten klasser tar rommet, rollene og rotasjonen fra kollegaens
 * klassefil: mottakeren har ingenting eget ennå, og da får elevene de samme
 * rollene som hos kollegaen. Ferier og resten av innstillingene er
 * mottakerens.
 */
function medOppsettFraFila(eksisterende, importert) {
  const { rom, rotasjonStart, rotasjonsroller } = importert.innstillinger;
  return {
    ...eksisterende,
    roller: importert.roller,
    innstillinger: { ...eksisterende.innstillinger, rom, rotasjonStart, rotasjonsroller },
  };
}

/**
 * Legger klassene fra fila inn som nye klasser. Hver klasse i fila erstatter
 * høyst én egen klasse med samme navn (se koblinger), med elever og
 * klassekart, og den nye klassen får plassen i lista. Har mottakeren klasser
 * fra før, er roller, rotasjon, ferier og rom mottakerens egne. Klassekart
 * uten elevliste i fila hoppes over. Har mottakeren ingen klasser og fila er en
 * backup, gjenopprettes alt slik det var.
 */
export function slaSammen(eksisterende, importert, { erBackup = false } = {}) {
  if (gjenopprettes(eksisterende, erBackup)) return importert;

  const grunnlag = eksisterende.elevlister.length === 0 ? medOppsettFraFila(eksisterende, importert) : eksisterende;
  const rom = grunnlag.innstillinger.rom;
  const nye = importert.elevlister.map((liste) =>
    kopierKlasse(liste, importert.klassekart.filter((k) => k.elevlisteId === liste.id), rom),
  );

  // Egen klasse-ID → den nye klassen som tar plassen dens.
  const par = koblinger(eksisterende, importert);
  const erstattes = new Map(par.flatMap((egen, i) => (egen ? [[egen.id, nye[i].liste]] : [])));
  const elevlister = [
    ...eksisterende.elevlister.map((l) => erstattes.get(l.id) ?? l),
    ...nye.filter((_, i) => !par[i]).map((k) => k.liste),
  ];

  const klassekart = [
    ...eksisterende.klassekart.filter((k) => !erstattes.has(k.elevlisteId)),
    ...nye.flatMap((k) => k.kart),
  ];

  const ny = { ...grunnlag, elevlister, klassekart };
  // Den første klassen fra fila blir aktiv, med det nyeste klassekartet.
  return nye.length ? velgElevliste(ny, nye[0].liste.id) : ny;
}

// ---------------------------------------------------------------------------
// Tekster til læreren
// ---------------------------------------------------------------------------

const sitat = (navn) => `«${navn}»`;

/** «Navn», med antall elever når en annen klasse i samme liste heter det samme. */
function klassenavn(liste, alle) {
  if (alle.filter((l) => nokkel(l.navn) === nokkel(liste.navn)).length < 2) return sitat(liste.navn);
  const n = liste.elever.length;
  return `${sitat(liste.navn)} (${n} ${n === 1 ? 'elev' : 'elever'})`;
}

function oppramsing(deler) {
  return deler.length <= 1 ? deler.join('') : `${deler.slice(0, -1).join(', ')} og ${deler.at(-1)}`;
}

/** Spørsmålet som stilles før importen. Advarer når en klasse blir overskrevet. */
export function importsporsmal(eksisterende, importert) {
  const klasser = importert.elevlister;
  const par = koblinger(eksisterende, importert);
  const iFila = (l) => klassenavn(l, klasser);
  const overskrevne = klasserSomErstattes(eksisterende, par).map((l) => klassenavn(l, eksisterende.elevlister));

  if (overskrevne.length === 0) {
    if (klasser.length === 1) {
      const antall = importert.klassekart.filter((k) => k.elevlisteId === klasser[0].id).length;
      const kart = antall ? `med ${antall} klassekart` : 'uten klassekart';
      return `Fila inneholder klassen ${sitat(klasser[0].navn)} ${kart}. Den legges inn som en ny klasse.`;
    }
    return `Fila inneholder ${klasser.length} klasser: ${oppramsing(klasser.map(iFila))}. De legges inn som nye klasser.`;
  }

  const deler = [
    overskrevne.length === 1
      ? `Du har allerede en klasse som heter ${overskrevne[0]}. Den blir overskrevet av klassen fra fila, med elever og klassekart.`
      : `Du har allerede klasser som heter ${oppramsing(overskrevne)}. De blir overskrevet av klassene fra fila, med elever og klassekart.`,
  ];
  // Klasser i fila som ikke erstatter noen, også når navnet finnes fra før.
  const andre = klasser.filter((_, i) => !par[i]).map(iFila);
  if (andre.length) {
    deler.push(`${oppramsing(andre)} legges inn som ${andre.length === 1 ? 'ny klasse' : 'nye klasser'}.`);
  }
  deler.push('Vil du fortsette?');
  return deler.join(' ');
}

/** Bekreftelsen etter importen. Sier fra når en backup er gjenopprettet. */
export function importmelding(eksisterende, importert, { erBackup = false } = {}) {
  const klasser = importert.elevlister;
  const navn = oppramsing(klasser.map((l) => klassenavn(l, klasser)));
  if (gjenopprettes(eksisterende, erBackup)) return `Backupen er lest inn: ${navn}, med roller og innstillinger.`;
  return klasser.length === 1 ? `Klassen ${navn} er lagt inn.` : `Klassene ${navn} er lagt inn.`;
}
