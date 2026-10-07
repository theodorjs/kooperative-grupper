import { describe, expect, it } from 'vitest';
import {
  erFerieuke,
  flyttRotasjonStart,
  lagRolleoversikt,
  ROLLEPOSISJONER,
  rolleposisjon,
  rollerForPlass,
  ukeforskyvning,
} from './roller.js';
import { leggTilDager } from './uke.js';

const START = '2026-08-17'; // mandag
const uke = (n) => leggTilDager(START, 7 * n);

describe('ukeforskyvning', () => {
  it('er 0 i startuka og øker med 1 hver mandag', () => {
    expect(ukeforskyvning(START, START)).toBe(0);
    expect(ukeforskyvning(START, uke(1))).toBe(1);
    expect(ukeforskyvning(START, uke(5))).toBe(5);
  });

  it('bruker mandagens rotasjon hele uka, også i helga', () => {
    for (let dag = 0; dag < 7; dag += 1) {
      expect(ukeforskyvning(START, leggTilDager(uke(3), dag))).toBe(3);
    }
    expect(ukeforskyvning(START, leggTilDager(uke(3), 7))).toBe(4);
  });

  it('godtar en startdato midt i uka og bruker mandagen', () => {
    expect(ukeforskyvning('2026-08-19', uke(2))).toBe(2);
  });

  it('er negativ før startuka', () => {
    expect(ukeforskyvning(START, uke(-1))).toBe(-1);
    expect(ukeforskyvning(START, uke(-3))).toBe(-3);
  });
});

describe('ferier', () => {
  const hostferie = { id: 'h', navn: 'Høstferie', fra: '2026-09-28', til: '2026-10-04' }; // uke(6)
  const ferier = [hostferie];

  it('kjenner igjen ferieuker ut fra mandagen', () => {
    expect(erFerieuke('2026-10-01', ferier)).toBe(true);
    expect(erFerieuke('2026-10-05', ferier)).toBe(false);
    expect(erFerieuke('2026-09-27', ferier)).toBe(false);
  });

  it('står stille i ferieuka, og uka etter ferien får nye roller', () => {
    const ukeFor = ukeforskyvning(START, uke(5), ferier);
    expect(ukeFor).toBe(5);
    expect(ukeforskyvning(START, uke(6), ferier)).toBe(ukeFor);
    expect(ukeforskyvning(START, uke(7), ferier)).toBe(ukeFor + 1);
    expect(ukeforskyvning(START, uke(8), ferier)).toBe(ukeFor + 2);
  });

  it('står stille gjennom ferier på flere uker', () => {
    const jul = [{ id: 'j', navn: 'Juleferie', fra: '2026-12-19', til: '2027-01-03' }];
    const forJul = ukeforskyvning(START, '2026-12-14', jul);
    expect(ukeforskyvning(START, '2026-12-21', jul)).toBe(forJul);
    expect(ukeforskyvning(START, '2026-12-28', jul)).toBe(forJul);
    expect(ukeforskyvning(START, '2027-01-04', jul)).toBe(forJul + 1);
  });

  it('teller uka som vanlig når ferien starter etter mandag', () => {
    const jul = [{ id: 'j', navn: 'Juleferie', fra: '2026-12-23', til: '2027-01-03' }];
    const forJul = ukeforskyvning(START, '2026-12-14', jul);
    expect(ukeforskyvning(START, '2026-12-21', jul)).toBe(forJul + 1);
    expect(erFerieuke('2026-12-21', jul)).toBe(false);
    expect(ukeforskyvning(START, '2026-12-28', jul)).toBe(forJul + 1);
    expect(ukeforskyvning(START, '2027-01-04', jul)).toBe(forJul + 2);
  });

  it('teller ferier riktig også bakover fra start', () => {
    expect(ukeforskyvning(uke(8), uke(5), ferier)).toBe(-2);
  });
});

describe('roller per plass', () => {
  it('starter med plass 1 på første rolleposisjon', () => {
    expect([1, 2, 3, 4].map((p) => rollerForPlass(p, 4, 0))).toEqual([[1], [2], [3], [4]]);
  });

  it('flytter alle én rolleposisjon videre hver uke, og siste går tilbake til første', () => {
    for (const storrelse of [1, 2, 3, 4, 5]) {
      const n = ROLLEPOSISJONER[storrelse].length;
      for (let k = -6; k < 10; k += 1) {
        for (let p = 1; p <= storrelse; p += 1) {
          const naa = rolleposisjon(p, storrelse, k);
          expect(rolleposisjon(p, storrelse, k + 1)).toBe(naa === n - 1 ? 0 : naa + 1);
        }
      }
    }
  });

  it('gir rollene i 4-grupper en full runde på fire uker', () => {
    expect([0, 1, 2, 3, 4].map((k) => rollerForPlass(1, 4, k))).toEqual([[1], [2], [3], [4], [1]]);
  });

  it('lar dobbeltrollen i 3-grupper gå på rundgang mellom alle tre på tre uker', () => {
    const harDobbeltrolle = (k) => [1, 2, 3].filter((p) => rollerForPlass(p, 3, k).length === 2);
    expect(harDobbeltrolle(0)).toEqual([2]);
    expect(harDobbeltrolle(1)).toEqual([1]);
    expect(harDobbeltrolle(2)).toEqual([3]);
    expect(rollerForPlass(2, 3, 0)).toEqual([2, 4]);
  });

  it('dekker alle fire roller hver uke i alle gruppestørrelser', () => {
    for (const storrelse of [1, 2, 3, 4, 5]) {
      for (let k = 0; k < 6; k += 1) {
        const roller = new Set();
        for (let p = 1; p <= storrelse; p += 1) rollerForPlass(p, storrelse, k).forEach((r) => roller.add(r));
        expect([...roller].sort()).toEqual([1, 2, 3, 4]);
      }
    }
  });

  it('har to oppmuntrere i 5-grupper', () => {
    const oppmuntrere = [1, 2, 3, 4, 5].filter((p) => rollerForPlass(p, 5, 0).includes(2));
    expect(oppmuntrere).toEqual([2, 5]);
  });
});

describe('manuell justering av startuka', () => {
  it('flytter rotasjonen nøyaktig én uke frem eller tilbake', () => {
    const dato = uke(4);
    const frem = flyttRotasjonStart(START, dato, [], 1);
    expect(frem).toBe(uke(-1));
    expect(ukeforskyvning(frem, dato)).toBe(5);
    expect(ukeforskyvning(flyttRotasjonStart(START, dato, [], -1), dato)).toBe(3);
  });

  it('gir ett synlig steg også når det er ferie i mellom', () => {
    const ferier = [{ id: 'f', navn: 'Ferie', fra: uke(-1), til: leggTilDager(uke(-1), 6) }];
    const dato = uke(4);
    const for_ = ukeforskyvning(START, dato, ferier);
    expect(ukeforskyvning(flyttRotasjonStart(START, dato, ferier, 1), dato, ferier)).toBe(for_ + 1);
  });
});

describe('rolleoversikt', () => {
  const gruppe = (id, nummer, elevIder) => ({
    id,
    nummer,
    storrelse: elevIder.length,
    plasser: elevIder.map((elevId, i) => ({ nummer: i + 1, elevId, last: false })),
  });
  const elever = 'abcdefghijkl'.split('').map((c) => ({ id: c, navn: `Elev ${c}` }));
  const kart = {
    bordgrupper: [gruppe('g2', 2, ['e', 'f', 'g']), gruppe('g1', 1, ['a', 'b', 'c', 'd']), gruppe('g3', 3, ['h', 'i', 'j', 'k', 'l'])],
  };

  it('sorterer etter gruppenummer og fordeler én elev per rolle', () => {
    const rader = lagRolleoversikt(kart, elever, 0);
    expect(rader.map((r) => r.nummer)).toEqual([1, 2, 3]);
    expect(rader[0].celler[1].map((c) => c.navn)).toEqual(['Elev a']);
    expect(rader[0].celler[4].map((c) => c.navn)).toEqual(['Elev d']);
  });

  it('viser dobbeltrollen i begge kolonner med markering', () => {
    const [, tre] = lagRolleoversikt(kart, elever, 0);
    expect(tre.celler[2]).toEqual([expect.objectContaining({ navn: 'Elev f', flereRoller: true })]);
    expect(tre.celler[4]).toEqual([expect.objectContaining({ navn: 'Elev f', flereRoller: true })]);
    expect(tre.celler[1][0].flereRoller).toBe(false);
  });

  it('setter begge oppmuntrerne i 5-gruppa under Oppmuntrer', () => {
    const [, , fem] = lagRolleoversikt(kart, elever, 0);
    expect(fem.celler[2].map((c) => c.navn)).toEqual(['Elev i', 'Elev l']);
  });

  it('følger plassnummeret, ikke rekkefølgen i lista', () => {
    const omnummerert = {
      bordgrupper: [{ ...gruppe('g1', 1, ['a', 'b', 'c', 'd']), plasser: [
        { nummer: 4, elevId: 'a', last: false },
        { nummer: 1, elevId: 'b', last: false },
        { nummer: 2, elevId: 'c', last: false },
        { nummer: 3, elevId: 'd', last: false },
      ] }],
    };
    const [rad] = lagRolleoversikt(omnummerert, elever, 0);
    expect(rad.celler[1][0].navn).toBe('Elev b');
    expect(rad.celler[4][0].navn).toBe('Elev a');
  });

  it('viser tomme plasser uten navn', () => {
    const medTom = { bordgrupper: [gruppe('g1', 1, ['a', null, 'c', 'd'])] };
    const [rad] = lagRolleoversikt(medTom, elever, 0);
    expect(rad.celler[2][0].navn).toBeNull();
  });
});
