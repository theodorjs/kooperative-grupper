import { describe, expect, it } from 'vitest';
import { EKSEMPELKLASSE, EKSEMPELNAVN, lagEksempeldata } from './eksempel.js';
import { aktivElevliste, aktivtKlassekart } from './operasjoner.js';

const plassering = (data) => {
  const navn = new Map(aktivElevliste(data).elever.map((e) => [e.id, e.navn]));
  return aktivtKlassekart(data).bordgrupper.map((g) => g.plasser.map((p) => navn.get(p.elevId)));
};

describe('eksempelklassen', () => {
  it('har 15 elever, alle på en plass', () => {
    const data = lagEksempeldata('2026-10-12');
    expect(aktivElevliste(data).navn).toBe(EKSEMPELKLASSE);
    expect(EKSEMPELNAVN).toHaveLength(15);
    expect(plassering(data).flat().sort()).toEqual([...EKSEMPELNAVN].sort());
  });

  it('ser likt ut hver gang', () => {
    expect(plassering(lagEksempeldata('2026-10-12'))).toEqual(plassering(lagEksempeldata('2026-10-12')));
  });
});
