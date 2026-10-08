import { describe, expect, it } from 'vitest';
import { tolkImport } from '../data/lagring.js';
import { lagStandarddata } from '../data/standarddata.js';
import {
  endreRolle,
  leggTilRolle,
  nesteFarge,
  normaliserRotasjonsroller,
  plassIRotasjonen,
  ROLLEFARGER,
  rotasjonsroller,
  settRotasjonsrolle,
  slettRolle,
  STANDARDROLLER,
  tolkBeskrivelse,
} from './rollebibliotek.js';

const data = () => lagStandarddata('2026-10-08');

describe('standardrollene', () => {
  it('er de fire rollene fra plakatene, med fargene fra «Denne uka»', () => {
    expect(STANDARDROLLER.map((r) => `${r.ikon} ${r.navn} ${r.farge}`)).toEqual([
      '🧹 Materialforvalter #2E7D32',
      '🙌 Oppmuntrer #E65100',
      '📢 Reporter #1565C0',
      '✅ Sjekker #6A1B9A',
    ]);
  });

  it('står på plass 1 til 4 i rotasjonen', () => {
    expect(rotasjonsroller(data()).map((r) => `${r.nummer} ${r.navn}`)).toEqual([
      '1 Materialforvalter',
      '2 Oppmuntrer',
      '3 Reporter',
      '4 Sjekker',
    ]);
  });
});

describe('endre biblioteket', () => {
  it('legger til en ny rolle med egen ID', () => {
    const ny = leggTilRolle(data(), { navn: 'Tidtaker', ikon: '⏱️', farge: '#0E9384', beskrivelse: '- Passer tiden' });
    expect(ny.roller).toHaveLength(5);
    const rolle = ny.roller.at(-1);
    expect(rolle).toMatchObject({ navn: 'Tidtaker', ikon: '⏱️', farge: '#0E9384' });
    expect(STANDARDROLLER.map((r) => r.id)).not.toContain(rolle.id);
  });

  it('endrer navn, ikon og beskrivelse, og endringen vises i rotasjonen', () => {
    const ny = endreRolle(data(), 'reporter', { navn: 'Sekretær', ikon: '📝', beskrivelse: 'Skriver ned' });
    expect(rotasjonsroller(ny)[2]).toMatchObject({ nummer: 3, navn: 'Sekretær', ikon: '📝' });
  });

  it('beholder gammelt navn når det nye er tomt, og kan ikke endre ID', () => {
    const ny = endreRolle(data(), 'reporter', { navn: '   ', id: 'noe-annet' });
    expect(ny.roller.find((r) => r.id === 'reporter').navn).toBe('Reporter');
    expect(ny.roller.map((r) => r.id)).toContain('reporter');
  });

  it('sletter ikke roller som brukes i rotasjonen', () => {
    const d = data();
    expect(slettRolle(d, 'sjekker')).toBe(d);
  });

  it('sletter roller som ikke brukes', () => {
    let d = leggTilRolle(data(), { navn: 'Tidtaker', farge: '#0E9384' });
    const id = d.roller.at(-1).id;
    d = slettRolle(d, id);
    expect(d.roller.map((r) => r.id)).toEqual(STANDARDROLLER.map((r) => r.id));
  });
});

describe('roller i rotasjonen', () => {
  it('setter en ny rolle på en plass, og den gamle kan da slettes', () => {
    let d = leggTilRolle(data(), { navn: 'Tidtaker', farge: '#0E9384' });
    const id = d.roller.at(-1).id;
    d = settRotasjonsrolle(d, 3, id);
    expect(rotasjonsroller(d)[2].navn).toBe('Tidtaker');
    expect(plassIRotasjonen(d, 'reporter')).toBeNull();
    expect(slettRolle(d, 'reporter').roller.map((r) => r.id)).not.toContain('reporter');
  });

  it('bytter plass når rollen allerede er i rotasjonen', () => {
    const d = settRotasjonsrolle(data(), 1, 'sjekker');
    expect(d.innstillinger.rotasjonsroller).toEqual(['sjekker', 'oppmuntrer', 'reporter', 'materialforvalter']);
  });

  it('fyller manglende eller doble plasser med roller som finnes', () => {
    const roller = STANDARDROLLER;
    expect(normaliserRotasjonsroller(['sjekker', 'sjekker', 'finnes-ikke'], roller)).toEqual([
      'sjekker',
      'oppmuntrer',
      'reporter',
      'materialforvalter',
    ]);
  });
});

describe('lagring', () => {
  it('gir standardrollene til data som ble lagret før rollebiblioteket fantes', () => {
    const gammel = data();
    delete gammel.roller;
    delete gammel.innstillinger.rotasjonsroller;
    const lest = tolkImport(JSON.stringify(gammel));
    expect(lest.roller).toEqual(STANDARDROLLER);
    expect(lest.innstillinger.rotasjonsroller).toEqual(STANDARDROLLER.map((r) => r.id));
  });

  it('tar med egne roller i eksport og import', () => {
    let d = leggTilRolle(data(), { navn: 'Tidtaker', ikon: '⏱️', farge: '#0E9384', beskrivelse: '- Passer tiden' });
    d = settRotasjonsrolle(d, 2, d.roller.at(-1).id);
    expect(tolkImport(JSON.stringify(d))).toEqual(d);
  });

  it('retter ugyldige farger', () => {
    const d = data();
    d.roller[0].farge = 'rød';
    expect(ROLLEFARGER).toContain(tolkImport(JSON.stringify(d)).roller[0].farge);
  });
});

describe('beskrivelse og farge', () => {
  it('lager underoverskrifter, punkter og avsnitt', () => {
    expect(tolkBeskrivelse('I løpet av dagen\n- Tørke tavla\n• Rydde\n\nPå slutten av dagen\n- Feie\nHusk å smile.')).toEqual([
      { type: 'overskrift', tekst: 'I løpet av dagen' },
      { type: 'liste', punkter: ['Tørke tavla', 'Rydde'] },
      { type: 'overskrift', tekst: 'På slutten av dagen' },
      { type: 'liste', punkter: ['Feie'] },
      { type: 'avsnitt', tekst: 'Husk å smile.' },
    ]);
  });

  it('foreslår en farge som ikke er brukt fra før', () => {
    expect(nesteFarge(STANDARDROLLER)).toBe('#0E9384');
  });
});
