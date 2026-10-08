import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./farger.css', import.meta.url), 'utf8');

function blokk(selektor) {
  const start = css.indexOf(`${selektor} {`);
  expect(start).toBeGreaterThan(-1);
  const innhold = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  return innhold.split('\n').map((l) => l.trim()).filter(Boolean);
}

describe('fargesystemet', () => {
  it('har like verdier for valget «Mørk» og for automatisk mørk modus', () => {
    expect(blokk(':root:not([data-theme="light"])')).toEqual(blokk('html[data-theme="dark"]'));
  });

  it('bruker mørke farger bare på skjerm, så utskrift blir lys', () => {
    expect(css).toMatch(/@media screen \{\s*html\[data-theme="dark"\]/);
    expect(css).toMatch(/@media screen and \(prefers-color-scheme: dark\) \{\s*:root:not\(\[data-theme="light"\]\)/);
  });

  it('har en mørk verdi for hver farge som skal endres', () => {
    const lyse = blokk(':root').filter((l) => l.startsWith('--')).map((l) => l.split(':')[0]);
    for (const linje of blokk('html[data-theme="dark"]').filter((l) => l.startsWith('--'))) {
      expect(lyse).toContain(linje.split(':')[0]);
    }
  });
});
