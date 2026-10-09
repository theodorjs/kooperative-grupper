import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { aktivSkole, SKOLER, skoleForAdresse, skoleForVert } from './skoletema.js';

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

/** Kjører skriptet i <head> med en falsk adresse og gir tilbake data-skole. */
function kjorHodeskript(vert, sok = '', lager = { getItem: () => null }) {
  const skript = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const attributter = new Map();
  runInNewContext(skript, {
    localStorage: lager,
    location: { hostname: vert, search: sok },
    URLSearchParams,
    document: { documentElement: { setAttribute: (k, v) => attributter.set(k, v) } },
  });
  return attributter.get('data-skole') ?? null;
}

describe('skolefarger', () => {
  it('finner skolen etter adressen, med og uten www og store bokstaver', () => {
    expect(skoleForVert('torderodskole.no')).toBe('torderod');
    expect(skoleForVert('www.torderodskole.no')).toBe('torderod');
    expect(skoleForVert('WWW.Torderodskole.NO')).toBe('torderod');
  });

  it('bruker vanlige farger på andre adresser', () => {
    expect(skoleForVert('theodorjs.github.io')).toBeNull();
    expect(skoleForVert('localhost')).toBeNull();
    expect(skoleForVert('torderodskole.no.example.com')).toBeNull();
    expect(skoleForVert('')).toBeNull();
  });

  it('lar ?skole= forhåndsvise eller slå av skolefargene', () => {
    expect(skoleForAdresse('theodorjs.github.io', '?skole=torderod')).toBe('torderod');
    expect(skoleForAdresse('torderodskole.no', '?skole=ingen')).toBeNull();
    expect(skoleForAdresse('localhost', '?skole=ukjent')).toBeNull();
    expect(skoleForAdresse('torderodskole.no', '?skole=ukjent')).toBe('torderod');
  });

  it('leser aktiv skole fra <html>', () => {
    expect(aktivSkole({ dataset: { skole: 'torderod' } })?.navn).toBe('Torderød skole');
    expect(aktivSkole({ dataset: {} })).toBeNull();
    expect(aktivSkole({ dataset: { skole: 'ukjent' } })).toBeNull();
    expect(aktivSkole(null)).toBeNull();
  });

  it('har samme skoletabell i index.html som i SKOLER', () => {
    const tabell = html.match(/var skoler = (\{[^}]*\});/)[1];
    const iHtml = Object.fromEntries([...tabell.matchAll(/'([^']+)': '([^']+)'/g)].map((m) => [m[1], m[2]]));
    const forventet = Object.fromEntries(SKOLER.flatMap((s) => s.verter.map((v) => [v, s.id])));
    expect(iHtml).toEqual(forventet);
  });

  it('velger likt i index.html og i skoleForAdresse', () => {
    const tilfeller = [
      ['torderodskole.no', ''],
      ['www.TorderodSkole.no', ''],
      ['theodorjs.github.io', ''],
      ['theodorjs.github.io', '?skole=torderod'],
      ['torderodskole.no', '?skole=ingen'],
      ['localhost', '?skole=ukjent'],
      ['localhost', '?fane=kart&skole=torderod'],
    ];
    for (const [vert, sok] of tilfeller) {
      expect(kjorHodeskript(vert, sok), `${vert}${sok}`).toBe(skoleForAdresse(vert, sok));
    }
  });

  it('setter skolefargene selv om lagringen er stengt', () => {
    const stengt = {
      getItem: () => {
        throw new Error('SecurityError');
      },
    };
    expect(kjorHodeskript('torderodskole.no', '', stengt)).toBe('torderod');
  });
});
