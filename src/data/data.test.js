import { describe, expect, it } from 'vitest';
import { lesData, LAGRINGSNOKKEL, normaliser, skrivData, tolkImport } from './lagring.js';
import { lagStandarddata } from './standarddata.js';
import {
  aktivElevliste,
  aktivtKlassekart,
  dupliserKlassekart,
  elevensPlassIAktivtKart,
  fjernElev,
  nyttKlassekart,
  oppdaterKlassekart,
  opprettElevliste,
  slettElevliste,
  slettKlassekart,
  tolkNavneliste,
  velgElevliste,
  velgKlassekart,
} from './operasjoner.js';
import { plasserteElevIder, tilfeldigFordeling } from '../logikk/tildeling.js';
import {
  antallPlasser,
  automatiskOrientering,
  harEgetOppsett,
  settAutomatiskOrientering,
  settGruppeoppsett,
  settKlasseoppsett,
} from '../logikk/grupper.js';
import { effektivtOppsett, lagMal, standardKlasseoppsett } from '../logikk/maler.js';

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

  it('gir nye klassekart samme layout som det aktive kartet', () => {
    let data = dataMedKlasse();
    data = oppdaterKlassekart(data, data.innstillinger.aktivtKlassekartId, (k) => settKlasseoppsett(k, 3, 'rekke'));
    const nytt = aktivtKlassekart(nyttKlassekart(data, 'Nytt'));
    expect(nytt.oppsett[3]).toBe('rekke');
    expect(nytt.bordgrupper.every((g) => g.oppsett === null)).toBe(true);
    const annenListe = aktivtKlassekart(opprettElevliste(data, 'Ny gruppe', navn(10)));
    expect(annenListe.oppsett[3]).toBe('rekke');
    const kopi = aktivtKlassekart(dupliserKlassekart(data, data.innstillinger.aktivtKlassekartId, 'Kopi'));
    expect(kopi.oppsett[3]).toBe('rekke');
    const forste = aktivtKlassekart(opprettElevliste(lagStandarddata(), 'K', navn(4)));
    expect(forste.oppsett).toEqual(standardKlasseoppsett());
  });

  it('lar nye klassekart stå rett når automatisk orientering er slått av i det aktive kartet', () => {
    const orientering = (data, pa) =>
      oppdaterKlassekart(data, data.innstillinger.aktivtKlassekartId, (k) => ({
        ...k,
        bordgrupper: settAutomatiskOrientering(k.bordgrupper, pa),
      }));
    const rotasjoner = (data) => aktivtKlassekart(data).bordgrupper.map((g) => g.rotasjon);

    const av = orientering(dataMedKlasse(), false);
    expect(automatiskOrientering(aktivtKlassekart(av).bordgrupper)).toBe('ingen');
    expect(rotasjoner(nyttKlassekart(av, 'Nytt')).every((r) => r === 0)).toBe(true);
    expect(rotasjoner(opprettElevliste(av, 'Ny gruppe', navn(10))).every((r) => r === 0)).toBe(true);

    const pa = dataMedKlasse();
    expect(rotasjoner(nyttKlassekart(pa, 'Nytt')).every((r) => r === null)).toBe(true);
    const blandet = oppdaterKlassekart(pa, pa.innstillinger.aktivtKlassekartId, (k) => ({
      ...k,
      bordgrupper: k.bordgrupper.map((g, i) => (i === 0 ? { ...g, rotasjon: 0 } : g)),
    }));
    expect(automatiskOrientering(aktivtKlassekart(blandet).bordgrupper)).toBe('noen');
    expect(rotasjoner(nyttKlassekart(blandet, 'Nytt')).every((r) => r === null)).toBe(true);
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
    let data = dataMedKlasse();
    data.innstillinger.ferier.push({ id: 'f', navn: 'Høstferie', fra: '2026-09-28', til: '2026-10-02' });
    data.klassekart[0].bordgrupper[0].rotasjon = 12.5;
    data.klassekart[0].bordgrupper[1].navn = 'Løvene';
    data.klassekart[0].visGruppenavn = false;
    data = oppdaterKlassekart(data, data.klassekart[0].id, (k) => {
      const ny = settKlasseoppsett(settKlasseoppsett(k, 3, 'rekke'), 5, 'lang-hoyre');
      return { ...ny, bordgrupper: ny.bordgrupper.map((g, i) => (i === 0 ? settGruppeoppsett(g, 'blokk', ny) : g)) };
    });
    const importert = tolkImport(JSON.stringify(data, null, 2));
    expect(importert).toEqual(data);
    expect(importert.klassekart[0].oppsett).toMatchObject({ 3: 'rekke', 5: 'lang-hoyre' });
    expect(importert.klassekart[0].bordgrupper[0].oppsett).toBe('blokk');
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

  it('tegner data fra før layoutvalget akkurat som før', () => {
    const gruppe = (id, storrelse, langArm) => ({ id, nummer: 1, storrelse, langArm, x: 2, y: 2, plasser: [] });
    const data = normaliser({
      versjon: 1,
      elevlister: [],
      klassekart: [{ id: 'k', navn: 'K', elevlisteId: 'x', opprettet: '2026-10-07', bordgrupper: [
        gruppe('a', 5, 'hoyre'),
        gruppe('b', 5, 'venstre'),
        gruppe('c', 4, 'hoyre'),
        gruppe('d', 3),
      ] }],
      innstillinger: {},
    });
    const kart = data.klassekart[0];
    expect(kart.oppsett).toEqual(standardKlasseoppsett());
    expect(kart.bordgrupper.map((g) => g.oppsett)).toEqual(['lang-hoyre', null, null, null]);
    expect(kart.bordgrupper.map((g) => g.langArm)).toEqual(['hoyre', 'venstre', 'venstre', 'venstre']);
    const maler = kart.bordgrupper.map((g) => lagMal(g.storrelse, effektivtOppsett(g, kart)));
    expect(maler).toEqual([lagMal(5, 'lang-hoyre'), lagMal(5), lagMal(4), lagMal(3)]);
  });

  it('gir klassen lang arm høyre når alle 5-gruppene hadde det før layoutvalget', () => {
    const gruppe = (id, storrelse, langArm) => ({ id, nummer: 1, storrelse, langArm, x: 2, y: 2, plasser: [] });
    const gammeltKart = {
      id: 'k',
      navn: 'K',
      elevlisteId: 'x',
      opprettet: '2026-10-07',
      bordgrupper: [gruppe('a', 5, 'hoyre'), gruppe('b', 5, 'hoyre'), gruppe('c', 4, 'venstre')],
    };
    const data = normaliser({ versjon: 1, elevlister: [], klassekart: [gammeltKart], innstillinger: {} });
    const kart = data.klassekart[0];
    expect(kart.oppsett).toEqual({ ...standardKlasseoppsett(), 5: 'lang-hoyre' });
    expect(kart.bordgrupper.map((g) => g.oppsett)).toEqual([null, null, null]);
    expect(kart.bordgrupper.map((g) => effektivtOppsett(g, kart))).toEqual(['lang-hoyre', 'lang-hoyre', 'apen']);
    expect(kart.bordgrupper.map((g) => harEgetOppsett(g, kart))).toEqual([false, false, false]);
    expect(kart.bordgrupper.map((g) => g.langArm)).toEqual(['hoyre', 'hoyre', 'venstre']);

    // Kart som allerede har layoutvalget, endres ikke.
    const nyttKart = {
      ...gammeltKart,
      oppsett: standardKlasseoppsett(),
      bordgrupper: gammeltKart.bordgrupper.map((g) => ({ ...g, oppsett: g.storrelse === 5 ? 'lang-hoyre' : null })),
    };
    const nye = normaliser({ versjon: 1, elevlister: [], klassekart: [nyttKart], innstillinger: {} }).klassekart[0];
    expect(nye.oppsett[5]).toBe('lang-venstre');
    expect(nye.bordgrupper.map((g) => g.oppsett)).toEqual(['lang-hoyre', 'lang-hoyre', null]);
  });

  it('retter opp ukjente layouter', () => {
    const data = normaliser({
      versjon: 1,
      elevlister: [],
      klassekart: [{ id: 'k', navn: 'K', elevlisteId: 'x', opprettet: '2026-10-07',
        oppsett: { 2: 'mot', 3: 'blokk', 4: 7 },
        bordgrupper: [
          { id: 'a', nummer: 1, storrelse: 4, oppsett: 'rekke', x: 2, y: 2, plasser: [] },
          { id: 'b', nummer: 2, storrelse: 5, oppsett: null, langArm: 'hoyre', x: 2, y: 2, plasser: [] },
        ] }],
      innstillinger: {},
    });
    const kart = data.klassekart[0];
    expect(kart.oppsett).toEqual({ ...standardKlasseoppsett(), 2: 'mot' });
    expect(kart.bordgrupper.map((g) => g.oppsett)).toEqual([null, null]);
    expect(kart.bordgrupper[1].langArm).toBe('venstre');
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
