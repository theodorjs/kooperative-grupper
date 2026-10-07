import { describe, expect, it } from 'vitest';
import { lesData, LAGRINGSNOKKEL, normaliser, skrivData, tolkImport } from './lagring.js';
import { lagStandarddata } from './standarddata.js';
import {
  aktivElevliste,
  aktivtKlassekart,
  dupliserKlassekart,
  elevensPlassIAktivtKart,
  fjernElev,
  opprettElevliste,
  slettElevliste,
  slettKlassekart,
  tolkNavneliste,
  velgElevliste,
  velgKlassekart,
} from './operasjoner.js';
import { plasserteElevIder, tilfeldigFordeling } from '../logikk/tildeling.js';
import { antallPlasser } from '../logikk/grupper.js';

function minnelager() {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), m };
}

const navn = (n) => Array.from({ length: n }, (_, i) => `Elev ${i + 1}`);

function dataMedKlasse(n = 21) {
  let data = opprettElevliste(lagStandarddata('2026-10-07'), '7A', navn(n), '2026-10-07');
  const kart = aktivtKlassekart(data);
  const elevIder = aktivElevliste(data).elever.map((e) => e.id);
  data = { ...data, klassekart: data.klassekart.map((k) => (k.id === kart.id ? tilfeldigFordeling(k, elevIder) : k)) };
  return data;
}

describe('navneliste', () => {
  it('leser ett navn per linje og hopper over tomme linjer', () => {
    expect(tolkNavneliste('  Elev A \r\n\nElev   B\n  \nElev C')).toEqual(['Elev A', 'Elev B', 'Elev C']);
  });
});

describe('elevlister og klassekart', () => {
  it('lager klassekart med 3 grupper á 4 og 3 grupper á 3 for en ny liste med 21 elever', () => {
    const data = opprettElevliste(lagStandarddata(), 'Klasse', navn(21));
    const kart = aktivtKlassekart(data);
    expect(kart.bordgrupper.map((g) => g.storrelse).sort()).toEqual([3, 3, 3, 4, 4, 4]);
    expect(antallPlasser(kart)).toBe(21);
  });

  it('gjør plassen tom når en elev fjernes, og varsler hvor eleven satt', () => {
    const data = dataMedKlasse();
    const liste = aktivElevliste(data);
    const elev = liste.elever[0];
    expect(elevensPlassIAktivtKart(data, elev.id)).not.toBeNull();
    const ny = fjernElev(data, liste.id, elev.id);
    expect(aktivElevliste(ny).elever).toHaveLength(20);
    expect(plasserteElevIder(aktivtKlassekart(ny)).has(elev.id)).toBe(false);
    expect(antallPlasser(aktivtKlassekart(ny))).toBe(21);
  });

  it('bytter aktivt klassekart når en annen elevliste velges', () => {
    let data = dataMedKlasse();
    const forsteListe = data.innstillinger.aktivElevlisteId;
    const forsteKart = data.innstillinger.aktivtKlassekartId;
    data = opprettElevliste(data, 'Ny gruppe', navn(10));
    expect(data.innstillinger.aktivtKlassekartId).not.toBe(forsteKart);
    data = velgElevliste(data, forsteListe);
    expect(data.innstillinger.aktivtKlassekartId).toBe(forsteKart);
  });

  it('dupliserer et klassekart med samme plassering men nye ID-er', () => {
    const data = dataMedKlasse();
    const original = aktivtKlassekart(data);
    const ny = dupliserKlassekart(data, original.id, 'Kopi');
    const kopi = aktivtKlassekart(ny);
    expect(kopi.id).not.toBe(original.id);
    expect(kopi.navn).toBe('Kopi');
    expect(kopi.bordgrupper.map((g) => g.plasser)).toEqual(original.bordgrupper.map((g) => g.plasser));
    expect(ny.klassekart).toHaveLength(2);
  });

  it('velger et annet kart for samme liste når det aktive slettes', () => {
    let data = dataMedKlasse();
    const forste = data.innstillinger.aktivtKlassekartId;
    data = dupliserKlassekart(data, forste, 'Kopi');
    data = slettKlassekart(data, data.innstillinger.aktivtKlassekartId);
    expect(data.innstillinger.aktivtKlassekartId).toBe(forste);
    data = velgKlassekart(data, forste);
    expect(aktivtKlassekart(data).id).toBe(forste);
  });

  it('sletter klassekartene sammen med elevlista', () => {
    let data = dataMedKlasse();
    const forsteListe = data.innstillinger.aktivElevlisteId;
    const forsteKart = data.innstillinger.aktivtKlassekartId;
    data = opprettElevliste(data, 'Ny gruppe', navn(10));
    const andreListe = data.innstillinger.aktivElevlisteId;
    data = slettElevliste(data, andreListe);
    expect(data.elevlister.map((l) => l.id)).toEqual([forsteListe]);
    expect(data.klassekart.map((k) => k.id)).toEqual([forsteKart]);
    expect(data.innstillinger.aktivElevlisteId).toBe(forsteListe);
    expect(data.innstillinger.aktivtKlassekartId).toBe(forsteKart);
    data = slettElevliste(data, forsteListe);
    expect(data.elevlister).toEqual([]);
    expect(data.innstillinger.aktivtKlassekartId).toBeNull();
  });
});

describe('lagring, eksport og import', () => {
  it('lagrer og leser inn igjen nøyaktig de samme dataene', () => {
    const lager = minnelager();
    const data = dataMedKlasse();
    skrivData(data, lager);
    expect(lesData(lager)).toEqual(data);
    expect(lager.m.has(LAGRINGSNOKKEL)).toBe(true);
  });

  it('gir like data etter eksport og import', () => {
    const data = dataMedKlasse();
    data.innstillinger.ferier.push({ id: 'f', navn: 'Høstferie', fra: '2026-09-28', til: '2026-10-02' });
    data.klassekart[0].bordgrupper[0].rotasjon = 12.5;
    expect(tolkImport(JSON.stringify(data, null, 2))).toEqual(data);
  });

  it('starter med tomme data uten elevnavn', () => {
    const data = lesData(minnelager());
    expect(data.elevlister).toEqual([]);
    expect(data.innstillinger.onsketGruppestorrelse).toBe(4);
    expect(data.innstillinger.rom).toEqual({ bredde: 9, lengde: 10 });
  });

  it('tar vare på uleselige data i stedet for å overskrive dem', () => {
    const lager = minnelager();
    lager.setItem(LAGRINGSNOKKEL, '{ødelagt');
    expect(lesData(lager).elevlister).toEqual([]);
    expect(lager.getItem('kooperative-grupper-uleselig')).toBe('{ødelagt');
  });

  it('avviser filer som ikke er fra appen', () => {
    expect(() => tolkImport('ikke json')).toThrow('gyldig JSON');
    expect(() => tolkImport('{"versjon": 2, "elevlister": [], "klassekart": []}')).toThrow('dataversjon');
    expect(() => tolkImport('[]')).toThrow();
  });

  it('retter opp ødelagte felt i importerte data', () => {
    const data = normaliser({
      versjon: 1,
      elevlister: [],
      klassekart: [{ id: 'k', navn: 'K', elevlisteId: 'x', opprettet: '2026-10-07', bordgrupper: [
        { id: 'g', nummer: 1, storrelse: 9, x: 'feil', y: 2, plasser: [{ nummer: 1, elevId: null }] },
      ] }],
      innstillinger: { rotasjonStart: '2026-10-07', onsketGruppestorrelse: 0 },
    });
    expect(data.klassekart[0].bordgrupper[0].storrelse).toBe(5);
    expect(data.klassekart[0].bordgrupper[0].plasser).toHaveLength(5);
    expect(data.innstillinger.rotasjonStart).toBe('2026-10-05');
    expect(data.innstillinger.onsketGruppestorrelse).toBe(1);
  });
});
