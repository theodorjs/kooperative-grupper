import { describe, expect, it } from 'vitest';
import {
  finnElev,
  fjernFraPlass,
  plasserElev,
  plasserteElevIder,
  settLas,
  tilfeldigFordeling,
  tomAllePlasser,
} from './tildeling.js';

function lagKart(storrelser) {
  return {
    id: 'k',
    bordgrupper: storrelser.map((n, i) => ({
      id: `g${i + 1}`,
      nummer: i + 1,
      storrelse: n,
      plasser: Array.from({ length: n }, (_, j) => ({ nummer: j + 1, elevId: null, last: false })),
    })),
  };
}

const elever = (n) => Array.from({ length: n }, (_, i) => `e${i + 1}`);

/** Forutsigbar "tilfeldighet" for testene. */
function seedet(frø) {
  let s = frø;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('plassere elever', () => {
  it('setter en elev fra lista på en tom plass', () => {
    const kart = plasserElev(lagKart([4]), 'e1', { gruppeId: 'g1', indeks: 2 });
    expect(finnElev(kart, 'e1')).toMatchObject({ gruppeId: 'g1', indeks: 2 });
  });

  it('bytter to elever som dras mellom to plasser, og låsen følger eleven', () => {
    let kart = plasserElev(lagKart([4, 4]), 'e1', { gruppeId: 'g1', indeks: 0 });
    kart = plasserElev(kart, 'e2', { gruppeId: 'g2', indeks: 3 });
    kart = settLas(kart, { gruppeId: 'g1', indeks: 0 }, true);
    kart = plasserElev(kart, 'e1', { gruppeId: 'g2', indeks: 3 });
    expect(finnElev(kart, 'e1')).toMatchObject({ gruppeId: 'g2', indeks: 3 });
    expect(finnElev(kart, 'e2')).toMatchObject({ gruppeId: 'g1', indeks: 0 });
    expect(finnElev(kart, 'e1').plass.last).toBe(true);
    expect(finnElev(kart, 'e2').plass.last).toBe(false);
  });

  it('gjør eleven som satt der uten plass når en elev kommer fra lista', () => {
    let kart = plasserElev(lagKart([4]), 'e1', { gruppeId: 'g1', indeks: 0 });
    kart = plasserElev(kart, 'e2', { gruppeId: 'g1', indeks: 0 });
    expect(finnElev(kart, 'e1')).toBeNull();
    expect(finnElev(kart, 'e2')).not.toBeNull();
  });

  it('endrer ikke kartet som sendes inn', () => {
    const original = lagKart([4]);
    plasserElev(original, 'e1', { gruppeId: 'g1', indeks: 0 });
    expect(plasserteElevIder(original).size).toBe(0);
  });

  it('fjerner en elev fra plassen', () => {
    const kart = fjernFraPlass(plasserElev(lagKart([4]), 'e1', { gruppeId: 'g1', indeks: 0 }), 'e1');
    expect(finnElev(kart, 'e1')).toBeNull();
  });

  it('kan ikke låse en tom plass', () => {
    const kart = settLas(lagKart([4]), { gruppeId: 'g1', indeks: 0 }, true);
    expect(kart.bordgrupper[0].plasser[0].last).toBe(false);
  });
});

describe('tilfeldig fordeling', () => {
  it('fyller alle plasser med 21 elever på 21 plasser', () => {
    const kart = tilfeldigFordeling(lagKart([4, 4, 4, 3, 3, 3]), elever(21), seedet(1));
    expect(plasserteElevIder(kart)).toEqual(new Set(elever(21)));
  });

  it('lar låste elever bli sittende', () => {
    let kart = plasserElev(lagKart([4, 4, 4, 3, 3, 3]), 'e5', { gruppeId: 'g1', indeks: 1 });
    kart = settLas(kart, { gruppeId: 'g1', indeks: 1 }, true);
    for (let frø = 1; frø < 20; frø += 1) {
      const ny = tilfeldigFordeling(kart, elever(21), seedet(frø));
      expect(ny.bordgrupper[0].plasser[1]).toMatchObject({ elevId: 'e5', last: true });
      expect(plasserteElevIder(ny).size).toBe(21);
    }
  });

  it('gir forskjellige fordelinger med forskjellig tilfeldighet', () => {
    const a = tilfeldigFordeling(lagKart([4, 4, 4]), elever(12), seedet(1));
    const b = tilfeldigFordeling(lagKart([4, 4, 4]), elever(12), seedet(2));
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it('lar elever stå uten plass når det er for få plasser', () => {
    const kart = tilfeldigFordeling(lagKart([4, 4]), elever(10), seedet(3));
    expect(plasserteElevIder(kart).size).toBe(8);
  });

  it('lar plasser stå tomme når det er for få elever', () => {
    const kart = tilfeldigFordeling(lagKart([4, 4]), elever(6), seedet(4));
    expect(plasserteElevIder(kart).size).toBe(6);
  });
});

describe('tømme plasser', () => {
  it('tømmer alle plasser og fjerner låser', () => {
    let kart = tilfeldigFordeling(lagKart([4, 3]), elever(7), seedet(5));
    kart = settLas(kart, { gruppeId: 'g1', indeks: 0 }, true);
    kart = tomAllePlasser(kart);
    expect(plasserteElevIder(kart).size).toBe(0);
    expect(kart.bordgrupper[0].plasser[0].last).toBe(false);
  });
});
