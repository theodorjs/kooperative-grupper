import { describe, expect, it } from 'vitest';
import { klasseTilDeling } from './deling.js';
import { importmelding, importsporsmal, navnekollisjoner, slaSammen, tolkImportfil } from './import.js';
import {
  aktivElevliste,
  aktivtKlassekart,
  dupliserKlassekart,
  klassekartForListe,
  opprettElevliste,
} from './operasjoner.js';
import { lagStandarddata } from './standarddata.js';
import { tilfeldigFordeling } from '../logikk/tildeling.js';

const navn = (n, prefiks = 'Elev') => Array.from({ length: n }, (_, i) => `${prefiks} ${i + 1}`);

/** Ny klasse med elevene fordelt på plassene i det aktive kartet. */
function medKlasse(data, klassenavn, elevnavn) {
  let ny = opprettElevliste(data, klassenavn, elevnavn, '2026-10-07');
  const kart = aktivtKlassekart(ny);
  const ider = aktivElevliste(ny).elever.map((e) => e.id);
  ny = { ...ny, klassekart: ny.klassekart.map((k) => (k.id === kart.id ? tilfeldigFordeling(k, ider) : k)) };
  return ny;
}

/** Mottakeren har 7A (to klassekart) og 7B. */
function mottaker() {
  let data = medKlasse(lagStandarddata('2026-10-07'), '7A', navn(21));
  data = dupliserKlassekart(data, data.innstillinger.aktivtKlassekartId, 'Kopi', '2026-10-08');
  return medKlasse(data, '7B', navn(12, 'Bjørk'));
}

/** Kollegaen har 8C med to klassekart, egne roller og et større rom. */
function avsender() {
  let data = lagStandarddata('2026-08-17');
  data.innstillinger.rom = { bredde: 12, lengde: 14 };
  data.innstillinger.rotasjonsroller = [...data.innstillinger.rotasjonsroller].reverse();
  data.innstillinger.ferier = [{ id: 'f', navn: 'Høstferie', fra: '2026-09-28', til: '2026-10-02' }];
  data.roller = data.roller.map((r, i) => (i === 0 ? { ...r, navn: 'Endret rolle' } : r));
  data = medKlasse(data, '8C', navn(18, 'Gran'));
  return dupliserKlassekart(data, data.innstillinger.aktivtKlassekartId, 'Etter jul', '2026-12-01');
}

/** Slik importen ser fila: gjennom JSON og normaliser(). */
const sendKlasse = (data, listeId) => tolkImportfil(JSON.stringify(klasseTilDeling(data, listeId)));
const sendBackup = (data) => tolkImportfil(JSON.stringify(data));
const importer = (mottakerData, fil) => slaSammen(mottakerData, fil.data, { erBackup: fil.erBackup });

function alleIder(data) {
  return [
    ...data.elevlister.flatMap((l) => [l.id, ...l.elever.map((e) => e.id)]),
    ...data.klassekart.flatMap((k) => [k.id, ...k.bordgrupper.map((g) => g.id)]),
  ];
}

/** Elevnavnene plass for plass, så plasseringen kan sammenlignes på tvers av ID-er. */
function plasseringer(data, kart) {
  const liste = data.elevlister.find((l) => l.id === kart.elevlisteId);
  const navnFor = new Map(liste.elever.map((e) => [e.id, e.navn]));
  return kart.bordgrupper.map((g) => g.plasser.map((p) => (p.elevId ? navnFor.get(p.elevId) : null)));
}

describe('import av en klasse fra en kollega', () => {
  it('legger klassen inn som en ny klasse med nye ID-er', () => {
    const fra = avsender();
    const til = mottaker();
    const ny = importer(til, sendKlasse(fra, fra.elevlister[0].id));

    expect(ny.elevlister.map((l) => l.navn)).toEqual(['7A', '7B', '8C']);
    const liste = ny.elevlister[2];
    expect(liste.id).not.toBe(fra.elevlister[0].id);
    expect(liste.elever.map((e) => e.navn)).toEqual(navn(18, 'Gran'));
    const gamleIder = new Set(alleIder(fra));
    expect(liste.elever.some((e) => gamleIder.has(e.id))).toBe(false);

    const kart = klassekartForListe(ny, liste.id);
    expect(kart.map((k) => k.navn)).toEqual(['Klassekart 1', 'Etter jul']);
    expect(kart.flatMap((k) => [k.id, ...k.bordgrupper.map((g) => g.id)]).some((id) => gamleIder.has(id))).toBe(false);
    expect(new Set(alleIder(ny)).size).toBe(alleIder(ny).length);
  });

  it('lar elevene sitte på de samme plassene', () => {
    const fra = avsender();
    const ny = importer(mottaker(), sendKlasse(fra, fra.elevlister[0].id));
    const liste = ny.elevlister.at(-1);
    const importerte = klassekartForListe(ny, liste.id);
    const originale = klassekartForListe(fra, fra.elevlister[0].id);
    expect(importerte.map((k) => plasseringer(ny, k))).toEqual(originale.map((k) => plasseringer(fra, k)));
    const elevIder = new Set(liste.elever.map((e) => e.id));
    const plasserte = importerte.flatMap((k) => k.bordgrupper.flatMap((g) => g.plasser.map((p) => p.elevId)));
    expect(plasserte.filter(Boolean).every((id) => elevIder.has(id))).toBe(true);
    expect(plasserte.filter(Boolean)).toHaveLength(36);
  });

  it('gir nye ID-er også når fila har de samme ID-ene som mottakeren', () => {
    const til = mottaker();
    const egen = { ...til, elevlister: til.elevlister.map((l) => (l.navn === '7B' ? { ...l, navn: '7B kopi' } : l)) };
    const ny = importer(til, sendKlasse(egen, egen.elevlister[1].id));
    expect(ny.elevlister.map((l) => l.navn)).toEqual(['7A', '7B', '7B kopi']);
    expect(new Set(alleIder(ny)).size).toBe(alleIder(ny).length);
    expect(klassekartForListe(ny, ny.elevlister[1].id)).toEqual(klassekartForListe(til, til.elevlister[1].id));
  });

  it('lar de andre klassene være som før', () => {
    const fra = avsender();
    const til = mottaker();
    const ny = importer(til, sendKlasse(fra, fra.elevlister[0].id));
    expect(ny.elevlister.slice(0, 2)).toEqual(til.elevlister);
    expect(ny.klassekart.slice(0, 3)).toEqual(til.klassekart);
  });

  it('beholder mottakerens roller, rotasjon, ferier og rom', () => {
    const fra = avsender();
    const til = mottaker();
    const ny = importer(til, sendKlasse(fra, fra.elevlister[0].id));
    expect(ny.roller).toEqual(til.roller);
    const { aktivElevlisteId, aktivtKlassekartId, ...resten } = ny.innstillinger;
    const { aktivElevlisteId: a, aktivtKlassekartId: b, ...forventet } = til.innstillinger;
    expect(resten).toEqual(forventet);
    expect(aktivElevlisteId).not.toBe(a);
    expect(aktivtKlassekartId).not.toBe(b);
  });

  it('gjør den nye klassen og det nyeste klassekartet aktivt', () => {
    const fra = avsender();
    const ny = importer(mottaker(), sendKlasse(fra, fra.elevlister[0].id));
    expect(aktivElevliste(ny).navn).toBe('8C');
    expect(aktivtKlassekart(ny).navn).toBe('Etter jul');
  });

  it('flytter grupper som står utenfor rommet, inn i rommet', () => {
    const fra = avsender();
    const fil = structuredClone(klasseTilDeling(fra, fra.elevlister[0].id));
    const grupper = fil.klassekart[0].bordgrupper;
    Object.assign(grupper[0], { x: 11.5, y: 13 });
    Object.assign(grupper[1], { x: -2, y: 4 });
    Object.assign(grupper[2], { x: 3, y: 7.5 });
    const til = mottaker();
    const ny = slaSammen(til, fil);
    const importerte = klassekartForListe(ny, ny.elevlister[2].id).flatMap((k) => k.bordgrupper);
    const { bredde, lengde } = til.innstillinger.rom;
    expect(importerte.every((g) => g.x >= 0 && g.x <= bredde && g.y >= 0 && g.y <= lengde)).toBe(true);
    const [forste, andre, tredje] = importerte;
    expect([forste.x, forste.y]).toEqual([9, 10]);
    expect([andre.x, andre.y]).toEqual([0, 4]);
    expect([tredje.x, tredje.y]).toEqual([3, 7.5]);
  });

  it('tar vare på felt importen ikke kjenner', () => {
    const fra = avsender();
    const fil = structuredClone(klasseTilDeling(fra, fra.elevlister[0].id));
    fil.klassekart[0].oppsett = { 4: 'rekke' };
    fil.klassekart[0].bordgrupper[0].oppsett = 'rekke';
    fil.klassekart[0].bordgrupper[0].plasser[0].ekstra = true;
    const ny = slaSammen(mottaker(), fil);
    const kart = ny.klassekart.find((k) => k.navn === 'Klassekart 1' && k.elevlisteId === ny.elevlister[2].id);
    expect(kart.oppsett).toEqual({ 4: 'rekke' });
    expect(kart.bordgrupper[0].oppsett).toBe('rekke');
    expect(kart.bordgrupper[0].plasser[0].ekstra).toBe(true);
  });

  it('hopper over klassekart som ikke hører til en klasse i fila', () => {
    const fra = avsender();
    const fil = structuredClone(klasseTilDeling(fra, fra.elevlister[0].id));
    fil.klassekart.push({ ...fil.klassekart[0], id: 'foreldreloest', elevlisteId: 'finnes-ikke' });
    const til = mottaker();
    const ny = slaSammen(til, fil);
    expect(ny.klassekart).toHaveLength(til.klassekart.length + 2);
    expect(ny.klassekart.every((k) => ny.elevlister.some((l) => l.id === k.elevlisteId))).toBe(true);
  });

  it('endrer ingenting når fila ikke har klasser', () => {
    const til = mottaker();
    expect(slaSammen(til, lagStandarddata())).toEqual(til);
  });
});

describe('klasse med samme navn', () => {
  function annen7A() {
    const data = medKlasse(lagStandarddata('2026-10-07'), '7a', navn(20, 'Ny'));
    // Navn fra andre kilder kan ha mellomrom rundt seg.
    data.elevlister[0].navn = ' 7a ';
    return sendKlasse(data, data.elevlister[0].id);
  }

  it('finner klasser med samme navn uten å skille på store og små bokstaver', () => {
    expect(navnekollisjoner(mottaker(), annen7A().data)).toEqual(['7A']);
    expect(navnekollisjoner(mottaker(), avsender())).toEqual([]);
  });

  it('erstatter den gamle klassen og klassekartene, og ingenting annet', () => {
    const til = mottaker();
    const gammel = til.elevlister[0];
    const ny = importer(til, annen7A());

    expect(ny.elevlister.map((l) => l.navn)).toEqual([' 7a ', '7B']);
    expect(ny.elevlister[0].elever.map((e) => e.navn)).toEqual(navn(20, 'Ny'));
    expect(ny.elevlister.some((l) => l.id === gammel.id)).toBe(false);
    expect(ny.klassekart.some((k) => k.elevlisteId === gammel.id)).toBe(false);
    expect(klassekartForListe(ny, ny.elevlister[0].id)).toHaveLength(1);
    expect(ny.elevlister[1]).toEqual(til.elevlister[1]);
    expect(klassekartForListe(ny, til.elevlister[1].id)).toEqual(klassekartForListe(til, til.elevlister[1].id));
    expect(ny.roller).toEqual(til.roller);
    expect(aktivElevliste(ny).id).toBe(ny.elevlister[0].id);
    expect(aktivtKlassekart(ny).elevlisteId).toBe(ny.elevlister[0].id);
  });

  it('flytter ikke den aktive klassen når en annen klasse erstattes', () => {
    let til = mottaker();
    til = { ...til, innstillinger: { ...til.innstillinger, aktivElevlisteId: til.elevlister[1].id } };
    const ny = importer(til, annen7A());
    expect(ny.elevlister[1]).toEqual(til.elevlister[1]);
    expect(aktivElevliste(ny).navn).toBe(' 7a ');
  });
});

describe('import av en backup', () => {
  it('gjenoppretter alt når mottakeren ikke har klasser', () => {
    const fra = avsender();
    const fil = sendBackup(fra);
    expect(fil.erBackup).toBe(true);
    expect(importer(lagStandarddata('2026-10-07'), fil)).toEqual(fra);
  });

  it('legger en delt klasse inn som ny klasse også når mottakeren ikke har klasser', () => {
    const fra = avsender();
    const tom = lagStandarddata('2026-10-07');
    const ny = importer(tom, sendKlasse(fra, fra.elevlister[0].id));
    expect(ny.elevlister.map((l) => l.navn)).toEqual(['8C']);
    expect(ny.roller).toEqual(tom.roller);
    expect(ny.innstillinger.rom).toEqual(tom.innstillinger.rom);
    expect(aktivtKlassekart(ny).navn).toBe('Etter jul');
  });

  it('legger alle klassene i en backup inn hos en som har klasser fra før', () => {
    let fra = avsender();
    fra = medKlasse(fra, '7a', navn(19, 'Lind'));
    fra = medKlasse(fra, '9D', navn(10, 'Hassel'));
    const til = mottaker();
    const ny = importer(til, sendBackup(fra));

    expect(ny.elevlister.map((l) => l.navn)).toEqual(['7a', '7B', '8C', '9D']);
    expect(ny.elevlister[0].elever.map((e) => e.navn)).toEqual(navn(19, 'Lind'));
    expect(ny.elevlister[1]).toEqual(til.elevlister[1]);
    expect(ny.klassekart).toHaveLength(1 + 2 + 1 + 1);
    expect(new Set(alleIder(ny)).size).toBe(alleIder(ny).length);
    expect(ny.roller).toEqual(til.roller);
    expect(ny.innstillinger.ferier).toEqual(til.innstillinger.ferier);
    expect(aktivElevliste(ny).navn).toBe('8C');
  });
});

describe('tekster', () => {
  it('forteller at klassen legges inn som ny klasse', () => {
    const fra = avsender();
    const fil = sendKlasse(fra, fra.elevlister[0].id).data;
    expect(importsporsmal(mottaker(), fil)).toBe(
      'Fila inneholder klassen «8C» med 2 klassekart. Den legges inn som en ny klasse.',
    );
    const flere = medKlasse(medKlasse(lagStandarddata(), '5A', navn(3)), '5B', navn(3));
    expect(importsporsmal(mottaker(), flere)).toBe(
      'Fila inneholder 2 klasser: «5A» og «5B». De legges inn som nye klasser.',
    );
    expect(importmelding(fil)).toBe('Klassen «8C» er lagt inn.');
    expect(importmelding(flere)).toBe('Klassene «5A» og «5B» er lagt inn.');
  });

  it('advarer når en klasse blir overskrevet', () => {
    const fil = medKlasse(lagStandarddata(), '7a', navn(3));
    expect(importsporsmal(mottaker(), fil)).toBe(
      'Du har allerede en klasse som heter «7A». Den blir overskrevet av klassen fra fila, med elever og klassekart. Vil du fortsette?',
    );
    const flere = medKlasse(medKlasse(medKlasse(lagStandarddata(), '7B', navn(3)), '7A', navn(3)), '6C', navn(3));
    expect(importsporsmal(mottaker(), flere)).toBe(
      'Du har allerede klasser som heter «7A» og «7B». De blir overskrevet av klassene fra fila, med elever og ' +
        'klassekart. «6C» legges inn som ny klasse. Vil du fortsette?',
    );
  });
});
