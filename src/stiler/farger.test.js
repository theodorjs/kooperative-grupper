import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SKOLER } from '../data/skoletema.js';

const css = readFileSync(new URL('./farger.css', import.meta.url), 'utf8');
const skolecss = readFileSync(new URL('./skoler.css', import.meta.url), 'utf8');

function blokk(selektor, kilde = css) {
  const start = kilde.indexOf(`${selektor} {`);
  expect(start).toBeGreaterThan(-1);
  const innhold = kilde.slice(kilde.indexOf('{', start) + 1, kilde.indexOf('}', start));
  return innhold.split('\n').map((l) => l.trim()).filter(Boolean);
}

/** Fargene i en blokk som { '--navn': 'verdi' }. */
function variabler(linjer) {
  return Object.fromEntries(
    linjer
      .filter((l) => l.startsWith('--'))
      .map((l) => [l.slice(0, l.indexOf(':')), l.slice(l.indexOf(':') + 1).replace(/;$/, '').trim()]),
  );
}

// Kontrast etter WCAG 2. Tekst skal ha minst 4,5:1.
function luminans(hex) {
  expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function kontrast(a, b) {
  const [lys, mork] = [luminans(a), luminans(b)].sort((x, y) => y - x);
  return (lys + 0.05) / (mork + 0.05);
}

const KONTRASTPAR = [
  ['--bk-knapp-tekst', '--bk-knapp'],
  ['--bk-ink', '--bk-card'],
  ['--bk-ink', '--bk-bg'],
  ['--bk-muted', '--bk-card'],
  ['--bk-muted', '--bk-bg'],
  ['--bk-teal', '--bk-card'],
  ['--bk-teal', '--bk-bg'],
  ['--bk-teal-dark', '--bk-card'],
  ['--bk-amber-tekst', '--bk-card'],
];

/** Tekstfarger som er for svake mot bakgrunnen sin. */
function svakKontrast(farger) {
  return KONTRASTPAR.map(([tekst, bakgrunn]) => ({
    par: `${tekst} på ${bakgrunn}`,
    kontrast: Math.round(kontrast(farger[tekst], farger[bakgrunn]) * 100) / 100,
  })).filter((k) => k.kontrast < 4.5);
}

/** Hvor mange klammer selektoren står inni (0 betyr utenfor alle medieregler). */
function dybde(selektor, kilde) {
  const foran = kilde.slice(0, kilde.indexOf(`${selektor} {`));
  return foran.split('{').length - foran.split('}').length;
}

const standardLys = variabler(blokk(':root'));
const standardMorke = variabler(blokk('html[data-theme="dark"]'));
const standardMork = { ...standardLys, ...standardMorke };

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

  // Standardfargene kommer fra «Min bruksanvisning». Svak kontrast der meldes, men stopper ikke testene.
  it('melder fra om svak kontrast i standardfargene', () => {
    for (const [modus, farger] of [['lys', standardLys], ['mørk', standardMork]]) {
      const svake = svakKontrast(farger);
      if (svake.length > 0) console.warn(`Standardfargene (${modus}) har svak kontrast:`, svake);
    }
  });
});

describe.each(SKOLER)('skolefargene til $navn', ({ id }) => {
  const lys = `html[data-skole="${id}"]`;
  const mork = `html[data-skole="${id}"][data-theme="dark"]`;
  const autoMork = `html[data-skole="${id}"]:not([data-theme="light"])`;
  const lyse = variabler(blokk(lys, skolecss));
  const morke = variabler(blokk(mork, skolecss));

  it('har like verdier for valget «Mørk» og for automatisk mørk modus', () => {
    expect(blokk(autoMork, skolecss)).toEqual(blokk(mork, skolecss));
  });

  it('gjelder lyse farger også på utskrift, og mørke bare på skjerm', () => {
    expect(dybde(lys, skolecss)).toBe(0);
    expect(skolecss.slice(0, skolecss.indexOf(`${mork} {`)).trimEnd()).toMatch(/@media screen \{$/);
    expect(skolecss.slice(0, skolecss.indexOf(`${autoMork} {`)).trimEnd()).toMatch(
      /@media screen and \(prefers-color-scheme: dark\) \{$/,
    );
  });

  // html[data-theme="dark"] og html[data-skole] veier like mye, så den lyse skolefargen
  // ville ellers vunnet over standardfargene i mørk modus.
  it('har en mørk verdi for hver farge den lyse blokken endrer', () => {
    for (const navn of Object.keys(lyse)) expect(morke, navn).toHaveProperty([navn]);
  });

  it('har en mørk verdi for hver farge standardfargene endrer i mørk modus', () => {
    for (const navn of Object.keys(standardMorke)) expect(morke, navn).toHaveProperty([navn]);
  });

  it('bruker bare farger som finnes i fargesystemet', () => {
    for (const navn of [...Object.keys(lyse), ...Object.keys(morke)]) expect(standardLys, navn).toHaveProperty([navn]);
  });

  it('har lesbar tekst i lys og mørk modus', () => {
    expect(svakKontrast({ ...standardLys, ...lyse })).toEqual([]);
    expect(svakKontrast({ ...standardMork, ...lyse, ...morke })).toEqual([]);
  });
});

// Det valgte layoutkortet i Layout-dialogen har en svak aksentflate over kortfargen.
describe('det valgte layoutkortet', () => {
  const appcss = readFileSync(new URL('./app.css', import.meta.url), 'utf8');
  const navn = variabler(blokk(':root', appcss)); // --tekst, --dempet osv.

  /** Tekstfargen en regel i app.css gir, eller null når regelen eller fargen mangler. */
  function tekstfarge(selektor) {
    const start = appcss.indexOf(`\n${selektor} {`);
    if (start === -1) return null;
    const linje = blokk(selektor, appcss.slice(start)).find((l) => l.startsWith('color:'));
    return linje ? linje.slice('color:'.length).replace(/;$/, '').trim() : null;
  }

  const los = (verdi, farger) => {
    const v = verdi.match(/^var\((--[\w-]+)\)$/);
    return v ? los(farger[v[1]], farger) : verdi;
  };

  /** En rgba-farge lagt over en hex-farge, som hex. */
  function leggOver(rgba, under) {
    const [r, g, b, a] = rgba.match(/[\d.]+/g).map(Number);
    const bunn = [1, 3, 5].map((i) => parseInt(under.slice(i, i + 2), 16));
    return `#${[r, g, b].map((c, i) => Math.round(c * a + bunn[i] * (1 - a)).toString(16).padStart(2, '0')).join('')}`;
  }

  const temaer = [
    ['standard lys', standardLys],
    ['standard mørk', standardMork],
    ...SKOLER.flatMap(({ id, navn: skole }) => {
      const lyse = variabler(blokk(`html[data-skole="${id}"]`, skolecss));
      const morke = variabler(blokk(`html[data-skole="${id}"][data-theme="dark"]`, skolecss));
      return [
        [`${skole} lys`, { ...standardLys, ...lyse }],
        [`${skole} mørk`, { ...standardMork, ...lyse, ...morke }],
      ];
    }),
  ];

  it.each(temaer)('har lesbar beskrivelse (%s)', (_, tema) => {
    const farger = { ...navn, ...tema };
    const beskrivelse =
      tekstfarge(".oppsettvalg[aria-pressed='true'] .oppsettvalg-beskrivelse") ?? tekstfarge('.oppsettvalg-beskrivelse');
    const kort = los('var(--flate)', farger);
    const bakgrunn = leggOver(los('var(--aksent-lys)', farger), kort);
    expect(kontrast(los(beskrivelse, farger), bakgrunn)).toBeGreaterThanOrEqual(4.5);
  });
});
