import { describe, expect, it } from 'vitest';
import {
  beregnGruppestorrelser,
  beskrivAvvik,
  endreGruppestorrelse,
  lagBordgrupper,
  nyNummerering,
  ordneIRutenett,
  standardPosisjoner,
} from './grupper.js';

const ROM = { bredde: 9, lengde: 10 };
const telle = (liste) => liste.reduce((acc, n) => ({ ...acc, [n]: (acc[n] ?? 0) + 1 }), {});

describe('gruppestørrelser etter prinsippet', () => {
  it('gir 3 grupper med 4 og 3 grupper med 3 for 21 elever og ønsket størrelse 4', () => {
    const storrelser = beregnGruppestorrelser(21, 4);
    expect(storrelser).toHaveLength(6);
    expect(telle(storrelser)).toEqual({ 4: 3, 3: 3 });
  });

  it('følger formelen G = ceil(N/S) og S·G − N små grupper', () => {
    for (let s = 1; s <= 5; s += 1) {
      for (let n = s; n <= 40; n += 1) {
        const g = Math.ceil(n / s);
        const sma = s * g - n;
        if (sma > g) continue; // for få elever til formelen; se egen test
        const storrelser = beregnGruppestorrelser(n, s);
        expect(storrelser).toHaveLength(g);
        expect(storrelser.filter((x) => x === s - 1)).toHaveLength(sma);
        expect(storrelser.filter((x) => x === s)).toHaveLength(g - sma);
      }
    }
  });

  it('fordeler jevnt når det er svært få elever', () => {
    expect(beregnGruppestorrelser(5, 4)).toEqual([3, 2]);
    expect(beregnGruppestorrelser(6, 5)).toEqual([3, 3]);
  });

  it('gir ingen grupper uten elever, og summen er alltid antall elever', () => {
    expect(beregnGruppestorrelser(0, 4)).toEqual([]);
    for (let n = 1; n < 35; n += 1) {
      for (let s = 1; s <= 5; s += 1) {
        expect(beregnGruppestorrelser(n, s).reduce((a, b) => a + b, 0)).toBe(n);
      }
    }
  });
});

describe('avvik', () => {
  it('beskriver elever uten plass og tomme plasser', () => {
    expect(beskrivAvvik(21, 21)).toBeNull();
    expect(beskrivAvvik(23, 21)).toBe('2 elever uten plass');
    expect(beskrivAvvik(22, 21)).toBe('1 elev uten plass');
    expect(beskrivAvvik(21, 24)).toBe('3 tomme plasser');
    expect(beskrivAvvik(21, 22)).toBe('1 tom plass');
  });
});

describe('standard plassering', () => {
  it('gir 3 rader med 2 grupper for 6 grupper i et rom som er lengre enn bredt', () => {
    const pos = standardPosisjoner(6, ROM);
    const xer = new Set(pos.map((p) => p.x.toFixed(3)));
    const yer = new Set(pos.map((p) => p.y.toFixed(3)));
    expect(xer.size).toBe(2);
    expect(yer.size).toBe(3);
  });

  it('holder alle grupper inne i rommet', () => {
    for (let n = 1; n <= 12; n += 1) {
      for (const p of standardPosisjoner(n, ROM)) {
        expect(p.x).toBeGreaterThan(0);
        expect(p.x).toBeLessThan(ROM.bredde);
        expect(p.y).toBeGreaterThan(0);
        expect(p.y).toBeLessThan(ROM.lengde);
      }
    }
  });

  it('nummererer gruppene fra 1 og lager én plass per elev', () => {
    const grupper = lagBordgrupper([4, 4, 3], ROM);
    expect(grupper.map((g) => g.nummer)).toEqual([1, 2, 3]);
    expect(grupper.map((g) => g.plasser.map((p) => p.nummer))).toEqual([[1, 2, 3, 4], [1, 2, 3, 4], [1, 2, 3]]);
    expect(grupper.every((g) => g.rotasjon === null)).toBe(true);
  });

  it('flytter grupper tilbake til rutenettet og slår på automatisk retning', () => {
    const grupper = lagBordgrupper([4, 4], ROM).map((g) => ({ ...g, x: 0, y: 0, rotasjon: 30 }));
    const ordnet = ordneIRutenett(grupper, ROM);
    expect(ordnet.map((g) => ({ x: g.x, y: g.y }))).toEqual(standardPosisjoner(2, ROM));
    expect(ordnet.every((g) => g.rotasjon === null)).toBe(true);
  });
});

describe('endre en bordgruppe', () => {
  const [gruppe] = lagBordgrupper([4], ROM);
  const full = { ...gruppe, plasser: gruppe.plasser.map((p, i) => ({ ...p, elevId: `e${i}`, last: i === 0 })) };

  it('beholder elevene på plassene som finnes fortsatt', () => {
    const mindre = endreGruppestorrelse(full, 3);
    expect(mindre.plasser.map((p) => p.elevId)).toEqual(['e0', 'e1', 'e2']);
    expect(mindre.plasser[0].last).toBe(true);
    const storre = endreGruppestorrelse(full, 5);
    expect(storre.plasser.map((p) => p.elevId)).toEqual(['e0', 'e1', 'e2', 'e3', null]);
  });

  it('bruker klikkrekkefølgen som ny nummerering', () => {
    const ny = nyNummerering(full, [3, 2, 1, 0]);
    expect(ny.plasser.map((p) => p.nummer)).toEqual([4, 3, 2, 1]);
  });
});
