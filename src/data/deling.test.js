import { describe, expect, it, vi } from 'vitest';
import { delEllerLastNed, delingsfilnavn, filnavnDel, klasseTilDeling } from './deling.js';
import { tolkImportfil } from './import.js';
import { backupfilnavn, lagDatafil, normaliser } from './lagring.js';
import { dupliserKlassekart, opprettElevliste } from './operasjoner.js';
import { lagStandarddata } from './standarddata.js';

const navn = (n, prefiks = 'Elev') => Array.from({ length: n }, (_, i) => `${prefiks} ${i + 1}`);

function toKlasser() {
  let data = opprettElevliste(lagStandarddata('2026-10-07'), '7A', navn(21), '2026-10-07');
  data = dupliserKlassekart(data, data.innstillinger.aktivtKlassekartId, 'Kopi', '2026-10-08');
  return opprettElevliste(data, '7B', navn(12, 'Annen'), '2026-10-07');
}

describe('filnavn', () => {
  it('bruker klassenavnet med bare trygge tegn', () => {
    expect(filnavnDel('7A')).toBe('7a');
    expect(filnavnDel(' Ærlige Ørn på Åsen – 5B ')).toBe('aerlige-orn-pa-asen-5b');
    expect(filnavnDel('Klasse é/ü')).toBe('klasse-e-u');
    expect(filnavnDel('!!!')).toBe('klasse');
    expect(filnavnDel('')).toBe('klasse');
  });

  it('gir filnavn som .gitignore stopper', () => {
    const monster = /^kooperative-grupper-.*\.json$/;
    expect(delingsfilnavn('7A', '2026-10-09')).toBe('kooperative-grupper-7a-2026-10-09.json');
    expect(backupfilnavn('2026-10-09')).toBe('kooperative-grupper-backup-2026-10-09.json');
    expect(delingsfilnavn('Æ', '2026-10-09')).toMatch(monster);
    expect(backupfilnavn()).toMatch(monster);
  });
});

describe('klassefil', () => {
  it('inneholder bare den valgte klassen og klassekartene dens', () => {
    const data = toKlasser();
    const liste = data.elevlister[0];
    const fil = klasseTilDeling(data, liste.id);
    expect(fil.elevlister).toEqual([liste]);
    expect(fil.klassekart).toHaveLength(2);
    expect(fil.klassekart.every((k) => k.elevlisteId === liste.id)).toBe(true);
    expect(fil.roller).toEqual(data.roller);
    expect(Object.keys(fil.innstillinger).sort()).toEqual(['rom', 'rotasjonsroller']);
    expect(klasseTilDeling(data, 'finnes-ikke')).toBeNull();
  });

  it('kan leses av importen og merkes som en delt klasse', async () => {
    const data = toKlasser();
    const fil = lagDatafil(klasseTilDeling(data, data.elevlister[1].id), 'x.json');
    expect(fil.type).toBe('application/json');
    const lest = tolkImportfil(await fil.text());
    expect(lest.erBackup).toBe(false);
    expect(lest.data.elevlister.map((l) => l.navn)).toEqual(['7B']);
    expect(() => normaliser(klasseTilDeling(data, data.elevlister[0].id))).not.toThrow();
    expect(tolkImportfil(JSON.stringify(data)).erBackup).toBe(true);
  });
});

describe('deling eller nedlasting', () => {
  const fil = () => new File(['{}'], 'kooperative-grupper-7a-2026-10-09.json', { type: 'application/json' });
  const feil = (name) => Object.assign(new Error(name), { name });

  function navigator({ canShare = () => true, share = () => Promise.resolve() } = {}) {
    return { canShare: canShare && vi.fn(canShare), share: share && vi.fn(share) };
  }

  it('laster ned når delingsmenyen mangler', async () => {
    const lastNed = vi.fn();
    expect(await delEllerLastNed(fil(), { nav: {}, lastNed })).toBe('lastet-ned');
    expect(await delEllerLastNed(fil(), { nav: undefined, lastNed })).toBe('lastet-ned');
    expect(lastNed).toHaveBeenCalledTimes(2);
  });

  it('laster ned når canShare mangler, sier nei eller kaster', async () => {
    for (const canShare of [null, () => false, () => undefined, () => { throw new TypeError(); }]) {
      const nav = navigator({ canShare });
      const lastNed = vi.fn();
      expect(await delEllerLastNed(fil(), { nav, lastNed })).toBe('lastet-ned');
      expect(lastNed).toHaveBeenCalledTimes(1);
      expect(nav.share).not.toHaveBeenCalled();
    }
  });

  it('deler bare fila, uten tittel eller tekst', async () => {
    const nav = navigator();
    const lastNed = vi.fn();
    const f = fil();
    expect(await delEllerLastNed(f, { nav, lastNed })).toBe('delt');
    expect(nav.canShare).toHaveBeenCalledWith({ files: [f] });
    expect(nav.share).toHaveBeenCalledWith({ files: [f] });
    expect(lastNed).not.toHaveBeenCalled();
  });

  it('kaller share() med en gang, før noe ventes på', () => {
    const nav = navigator({ share: () => new Promise(() => {}) });
    delEllerLastNed(fil(), { nav, lastNed: vi.fn() });
    expect(nav.share).toHaveBeenCalledTimes(1);
  });

  it('gjør ingenting når læreren avbryter eller trykker to ganger', async () => {
    for (const navn of ['AbortError', 'InvalidStateError']) {
      const nav = navigator({ share: () => Promise.reject(new DOMException('', navn)) });
      const lastNed = vi.fn();
      expect(await delEllerLastNed(fil(), { nav, lastNed })).toBe('avbrutt');
      expect(lastNed).not.toHaveBeenCalled();
    }
  });

  it('laster ned når nettleseren avviser fila', async () => {
    for (const grunn of [new DOMException('', 'NotAllowedError'), feil('DataError'), undefined]) {
      const nav = navigator({ share: () => Promise.reject(grunn) });
      const lastNed = vi.fn();
      const f = fil();
      expect(await delEllerLastNed(f, { nav, lastNed })).toBe('lastet-ned');
      expect(lastNed).toHaveBeenCalledWith(f);
    }
  });

  it('laster ned når share() kaster med en gang', async () => {
    const nav = navigator({ share: () => { throw new TypeError('ugyldig'); } });
    const lastNed = vi.fn();
    expect(await delEllerLastNed(fil(), { nav, lastNed })).toBe('lastet-ned');
    expect(lastNed).toHaveBeenCalledTimes(1);
  });
});
