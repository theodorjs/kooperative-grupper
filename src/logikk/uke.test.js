import { describe, expect, it } from 'vitest';
import {
  erGyldigDato,
  formaterUkeperiode,
  iDag,
  isoUke,
  leggTilDager,
  mandagForDato,
  ukedag,
  ukeoverskrift,
} from './uke.js';

describe('ukedager og mandager', () => {
  it('finner ukedag med mandag som 0', () => {
    expect(ukedag('2026-10-05')).toBe(0);
    expect(ukedag('2026-10-11')).toBe(6);
  });

  it('finner mandagen i uka, også fra søndag', () => {
    expect(mandagForDato('2026-10-05')).toBe('2026-10-05');
    expect(mandagForDato('2026-10-07')).toBe('2026-10-05');
    expect(mandagForDato('2026-10-11')).toBe('2026-10-05');
    expect(mandagForDato('2026-10-12')).toBe('2026-10-12');
  });

  it('legger til dager over månedsskifte og årsskifte', () => {
    expect(leggTilDager('2026-09-28', 6)).toBe('2026-10-04');
    expect(leggTilDager('2026-12-28', 7)).toBe('2027-01-04');
    expect(leggTilDager('2027-03-29', -7)).toBe('2027-03-22');
  });

  it('påvirkes ikke av sommertid', () => {
    expect(leggTilDager('2026-03-23', 7)).toBe('2026-03-30');
    expect(leggTilDager('2026-10-19', 7)).toBe('2026-10-26');
  });

  it('lager dagens dato fra lokal tid', () => {
    expect(iDag(new Date(2026, 9, 7, 23, 59))).toBe('2026-10-07');
  });

  it('kjenner igjen gyldige datoer', () => {
    expect(erGyldigDato('2026-10-05')).toBe(true);
    expect(erGyldigDato('2026-02-30')).toBe(false);
    expect(erGyldigDato('5.10.2026')).toBe(false);
    expect(erGyldigDato(undefined)).toBe(false);
  });
});

describe('ISO-ukenummer', () => {
  it('gir uke 41 for 5. til 11. oktober 2026', () => {
    for (let d = 5; d <= 11; d += 1) {
      expect(isoUke(`2026-10-${String(d).padStart(2, '0')}`)).toEqual({ uke: 41, aar: 2026 });
    }
  });

  it('håndterer uker rundt årsskiftet', () => {
    expect(isoUke('2024-12-30')).toEqual({ uke: 1, aar: 2025 });
    expect(isoUke('2026-01-01')).toEqual({ uke: 1, aar: 2026 });
    expect(isoUke('2027-01-01')).toEqual({ uke: 53, aar: 2026 });
    expect(isoUke('2027-01-04')).toEqual({ uke: 1, aar: 2027 });
  });
});

describe('tekst for uka', () => {
  it('skriver uka slik spesifikasjonen viser', () => {
    expect(ukeoverskrift('2026-10-07')).toBe('Uke 41 (5. til 11. oktober)');
  });

  it('skriver begge måneder når uka går over månedsskiftet', () => {
    expect(formaterUkeperiode('2026-09-28')).toBe('28. september til 4. oktober');
  });
});
