// Operasjoner på hele AppData. Alle er rene funksjoner: de tar inn data og
// returnerer nye data, slik at de er enkle å teste og bruke fra React.

import { nyId } from './id.js';
import { beregnGruppestorrelser, lagBordgrupper } from '../logikk/grupper.js';
import { finnElev, ryddUkjenteElever } from '../logikk/tildeling.js';
import { formaterDato, iDag } from '../logikk/uke.js';

const medInnstillinger = (data, endring) => ({
  ...data,
  innstillinger: { ...data.innstillinger, ...endring },
});

/** Ett navn per linje. Tomme linjer og ekstra mellomrom fjernes. */
export function tolkNavneliste(tekst) {
  return tekst
    .split(/\r?\n/)
    .map((linje) => linje.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

export function aktivElevliste(data) {
  return data.elevlister.find((l) => l.id === data.innstillinger.aktivElevlisteId) ?? null;
}

export function aktivtKlassekart(data) {
  return data.klassekart.find((k) => k.id === data.innstillinger.aktivtKlassekartId) ?? null;
}

export function elevlisteForKart(data, kart) {
  return kart ? data.elevlister.find((l) => l.id === kart.elevlisteId) ?? null : null;
}

export function klassekartForListe(data, listeId) {
  return data.klassekart.filter((k) => k.elevlisteId === listeId);
}

// ---------------------------------------------------------------------------
// Elevlister
// ---------------------------------------------------------------------------

/** Lager en ny elevliste, gjør den aktiv og lager et klassekart for den. */
export function opprettElevliste(data, navn, elevnavn, dato = iDag()) {
  const liste = {
    id: nyId(),
    navn: navn.trim() || 'Elevliste',
    elever: elevnavn.map((n) => ({ id: nyId(), navn: n })),
  };
  const ny = { ...data, elevlister: [...data.elevlister, liste] };
  return nyttKlassekart(medInnstillinger(ny, { aktivElevlisteId: liste.id }), `Klassekart ${formaterDato(dato, true)}`, dato);
}

export function velgElevliste(data, listeId) {
  const gjeldende = aktivtKlassekart(data);
  if (gjeldende?.elevlisteId === listeId) return medInnstillinger(data, { aktivElevlisteId: listeId });
  const kart = klassekartForListe(data, listeId);
  return medInnstillinger(data, {
    aktivElevlisteId: listeId,
    aktivtKlassekartId: kart.at(-1)?.id ?? null,
  });
}

export function endreElevlistenavn(data, listeId, navn) {
  return {
    ...data,
    elevlister: data.elevlister.map((l) => (l.id === listeId ? { ...l, navn: navn.trim() || l.navn } : l)),
  };
}

/** Sletter elevlista og alle klassekart som bygger på den. */
export function slettElevliste(data, listeId) {
  const elevlister = data.elevlister.filter((l) => l.id !== listeId);
  const klassekart = data.klassekart.filter((k) => k.elevlisteId !== listeId);
  const ny = { ...data, elevlister, klassekart };
  if (data.innstillinger.aktivElevlisteId !== listeId) return ny;
  const nesteListe = elevlister[0]?.id ?? null;
  return velgElevliste(medInnstillinger(ny, { aktivElevlisteId: null, aktivtKlassekartId: null }), nesteListe);
}

export function leggTilElever(data, listeId, navn) {
  const nye = navn.map((n) => ({ id: nyId(), navn: n }));
  return {
    ...data,
    elevlister: data.elevlister.map((l) => (l.id === listeId ? { ...l, elever: [...l.elever, ...nye] } : l)),
  };
}

export function endreElevnavn(data, listeId, elevId, navn) {
  const rent = navn.replace(/\s+/g, ' ').trim();
  if (!rent) return data;
  return {
    ...data,
    elevlister: data.elevlister.map((l) =>
      l.id === listeId ? { ...l, elever: l.elever.map((e) => (e.id === elevId ? { ...e, navn: rent } : e)) } : l,
    ),
  };
}

/** Hvor eleven sitter i det aktive klassekartet, eller null. */
export function elevensPlassIAktivtKart(data, elevId) {
  const kart = aktivtKlassekart(data);
  const funnet = kart ? finnElev(kart, elevId) : null;
  return funnet ? { gruppe: funnet.gruppe.nummer, plass: funnet.plass.nummer } : null;
}

/** Fjerner eleven fra lista. Plassene eleven satt på i klassekart blir tomme. */
export function fjernElev(data, listeId, elevId) {
  const elevlister = data.elevlister.map((l) =>
    l.id === listeId ? { ...l, elever: l.elever.filter((e) => e.id !== elevId) } : l,
  );
  const gjenvaerende = elevlister.find((l) => l.id === listeId)?.elever.map((e) => e.id) ?? [];
  const klassekart = data.klassekart.map((k) => (k.elevlisteId === listeId ? ryddUkjenteElever(k, gjenvaerende) : k));
  return { ...data, elevlister, klassekart };
}

// ---------------------------------------------------------------------------
// Klassekart
// ---------------------------------------------------------------------------

/** Nytt klassekart for den aktive elevlista, med grupper etter prinsippet. */
export function nyttKlassekart(data, navn, dato = iDag()) {
  const liste = aktivElevliste(data);
  if (!liste) return data;
  const storrelser = beregnGruppestorrelser(liste.elever.length, data.innstillinger.onsketGruppestorrelse);
  const kart = {
    id: nyId(),
    navn: navn.trim() || 'Klassekart',
    elevlisteId: liste.id,
    opprettet: dato,
    bordgrupper: lagBordgrupper(storrelser, data.innstillinger.rom),
  };
  return medInnstillinger({ ...data, klassekart: [...data.klassekart, kart] }, { aktivtKlassekartId: kart.id });
}

export function velgKlassekart(data, kartId) {
  const kart = data.klassekart.find((k) => k.id === kartId);
  if (!kart) return data;
  return medInnstillinger(data, { aktivtKlassekartId: kart.id, aktivElevlisteId: kart.elevlisteId });
}

export function dupliserKlassekart(data, kartId, navn, dato = iDag()) {
  const original = data.klassekart.find((k) => k.id === kartId);
  if (!original) return data;
  const kopi = {
    ...structuredClone(original),
    id: nyId(),
    navn: navn.trim() || `${original.navn} (kopi)`,
    opprettet: dato,
  };
  kopi.bordgrupper = kopi.bordgrupper.map((g) => ({ ...g, id: nyId() }));
  return medInnstillinger({ ...data, klassekart: [...data.klassekart, kopi] }, { aktivtKlassekartId: kopi.id });
}

export function endreKlassekartnavn(data, kartId, navn) {
  return {
    ...data,
    klassekart: data.klassekart.map((k) => (k.id === kartId ? { ...k, navn: navn.trim() || k.navn } : k)),
  };
}

export function slettKlassekart(data, kartId) {
  const klassekart = data.klassekart.filter((k) => k.id !== kartId);
  const ny = { ...data, klassekart };
  if (data.innstillinger.aktivtKlassekartId !== kartId) return ny;
  const neste = klassekartForListe(ny, data.innstillinger.aktivElevlisteId).at(-1)?.id ?? null;
  return medInnstillinger(ny, { aktivtKlassekartId: neste });
}

export function oppdaterKlassekart(data, kartId, endring) {
  return {
    ...data,
    klassekart: data.klassekart.map((k) => (k.id === kartId ? endring(k) : k)),
  };
}

export function oppdaterInnstillinger(data, endring) {
  return medInnstillinger(data, endring);
}
