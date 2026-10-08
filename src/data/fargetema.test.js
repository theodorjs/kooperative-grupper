import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { brukFargetema, FARGETEMA_NOKKEL, lagreFargetema, lesFargetema, temaAttributt } from './fargetema.js';

function minnelager() {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) };
}

function falskRot() {
  const attributter = new Map();
  return {
    setAttribute: (k, v) => attributter.set(k, v),
    removeAttribute: (k) => attributter.delete(k),
    hent: (k) => attributter.get(k) ?? null,
  };
}

describe('fargevalg', () => {
  it('er automatisk når ingenting er valgt eller verdien er ukjent', () => {
    const lager = minnelager();
    expect(lesFargetema(lager)).toBe('auto');
    lager.setItem(FARGETEMA_NOKKEL, 'blå');
    expect(lesFargetema(lager)).toBe('auto');
  });

  it('husker valget', () => {
    const lager = minnelager();
    lagreFargetema('mork', lager);
    expect(lesFargetema(lager)).toBe('mork');
  });

  it('setter data-theme på <html>, og fjerner den for automatisk', () => {
    const rot = falskRot();
    brukFargetema('mork', rot);
    expect(rot.hent('data-theme')).toBe('dark');
    brukFargetema('lys', rot);
    expect(rot.hent('data-theme')).toBe('light');
    brukFargetema('auto', rot);
    expect(rot.hent('data-theme')).toBeNull();
  });

  it('bruker samme nøkkel og verdier i skriptet i index.html', () => {
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    expect(html).toContain(`localStorage.getItem('${FARGETEMA_NOKKEL}')`);
    expect(html).toContain(`valg === 'mork') document.documentElement.setAttribute('data-theme', '${temaAttributt('mork')}')`);
    expect(html).toContain(`valg === 'lys') document.documentElement.setAttribute('data-theme', '${temaAttributt('lys')}')`);
  });
});
