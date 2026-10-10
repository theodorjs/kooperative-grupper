import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SKOLER } from '../data/skoletema.js';

const css = readFileSync(new URL('./farger.css', import.meta.url), 'utf8');
const skolecss = readFileSync(new URL('./skoler.css', import.meta.url), 'utf8');
const appcss = readFileSync(new URL('./app.css', import.meta.url), 'utf8');

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

/** Erstatter var(--navn) med verdien den peker på, så hver farge blir en ekte farge. */
function losOpp(farger) {
  const verdi = (v) => {
    const navn = /^var\((--[\w-]+)\)$/.exec(v)?.[1];
    return navn ? verdi(farger[navn]) : v;
  };
  return Object.fromEntries(Object.entries(farger).map(([navn, v]) => [navn, verdi(v)]));
}

/** En sRGB-kanal (0–255) som lineært lys. */
function lineaer(kanal) {
  const c = kanal / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

// Kontrast etter WCAG 2. Tekst skal ha minst 4,5:1.
function luminans(hex) {
  expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
  const [r, g, b] = [1, 3, 5].map((i) => lineaer(parseInt(hex.slice(i, i + 2), 16)));
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
  ['--bk-overskrift', '--bk-card'],
  ['--bk-overskrift', '--bk-bg'],
];

/** Tekstfarger som er for svake mot bakgrunnen sin. */
function svakKontrast(fargenavn) {
  const farger = losOpp(fargenavn);
  return KONTRASTPAR.map(([tekst, bakgrunn]) => ({
    par: `${tekst} på ${bakgrunn}`,
    kontrast: Math.round(kontrast(farger[tekst], farger[bakgrunn]) * 100) / 100,
  })).filter((k) => k.kontrast < 4.5);
}

/** '#RRGGBB' eller 'rgba(r, g, b, a)' som [r, g, b, a]. */
function kanaler(farge) {
  if (String(farge).startsWith('#')) {
    expect(farge).toMatch(/^#[0-9a-f]{6}$/i);
    return [...[1, 3, 5].map((i) => parseInt(farge.slice(i, i + 2), 16)), 1];
  }
  const tall = /^rgba\(([^)]*)\)$/.exec(farge)?.[1].split(',').map(Number) ?? [];
  expect(tall, String(farge)).toHaveLength(4);
  return tall;
}

/** Fargen en gjennomsiktig flate får over en bakgrunn, som [r, g, b]. */
function lagtOver(flate, bakgrunn) {
  const [r, g, b, a] = kanaler(flate);
  const under = kanaler(bakgrunn);
  return [r, g, b].map((c, i) => c * a + under[i] * (1 - a));
}

/** [r, g, b] i CIELAB (hvitpunkt D65). */
function lab(rgb) {
  const [r, g, b] = rgb.map(lineaer);
  const xyz = [
    (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047,
    0.2126 * r + 0.7152 * g + 0.0722 * b,
    (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883,
  ];
  const [fx, fy, fz] = xyz.map((t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116));
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** Flaten i LCh: [lyshet, metning, fargetone i grader]. */
function lch(rgb) {
  const [l, a, b] = lab(rgb);
  return [l, Math.hypot(a, b), ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360];
}

// Ok-meldingen («Klassen … er lagt inn») og feilmeldingen kommer på samme sted.
// Flatene skal kunne skilles på fargen, ikke bare på tekstfargen:
//   - forskjellen (ΔE, CIE76) på kortet skal synes; rundt 2 ses så vidt,
//   - og ok-flaten skal ikke se ut som en svakere feilflate. Den har enten en annen
//     fargetone (minst 45° unna) eller er nesten grå (høyst halvparten så mettet).
const MINSTE_FORSKJELL_OK_FEIL = 6;
const MINSTE_TONEAVSTAND_OK_FEIL = 45;
const STORSTE_METNING_OK_MOT_FEIL = 0.5;

/** Hva som eventuelt gjør ok-flaten lik feilflaten på kortet (tom liste er bra). */
function okLignerFeil(fargenavn) {
  const farger = losOpp(fargenavn);
  const ok = lagtOver(farger['--bk-ok-flate'], farger['--bk-card']);
  const feil = lagtOver(farger['--bk-fare-flate'], farger['--bk-card']);
  const [okLab, feilLab] = [lab(ok), lab(feil)];
  const forskjell = Math.hypot(...okLab.map((v, i) => v - feilLab[i]));
  const [, okMetning, okTone] = lch(ok);
  const [, feilMetning, feilTone] = lch(feil);
  const toneavstand = Math.min(Math.abs(okTone - feilTone), 360 - Math.abs(okTone - feilTone));
  const problemer = [];
  if (forskjell < MINSTE_FORSKJELL_OK_FEIL) problemer.push(`for lik: ΔE ${forskjell.toFixed(1)}`);
  if (toneavstand < MINSTE_TONEAVSTAND_OK_FEIL && okMetning > STORSTE_METNING_OK_MOT_FEIL * feilMetning) {
    problemer.push(`samme fargetone (${toneavstand.toFixed(0)}° unna) og nesten like mettet`);
  }
  return problemer;
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

  it('har egne fargenavn for overskrifter og ok-meldinger, som standard lik tekst og teal-flate', () => {
    expect(standardLys['--bk-overskrift']).toBe('var(--bk-ink)');
    expect(standardLys['--bk-ok-flate']).toBe('var(--bk-teal-flate)');
    expect(blokk('h1, h2', appcss)).toContain('color: var(--bk-overskrift);');
    expect(blokk('.varsel.ok', appcss)).toContain('background: var(--bk-ok-flate);');
  });

  it('skiller ok-meldingen fra feilmeldingen', () => {
    expect(okLignerFeil(standardLys)).toEqual([]);
    expect(okLignerFeil(standardMork)).toEqual([]);
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

  it('skiller ok-meldingen fra feilmeldingen i lys og mørk modus', () => {
    expect(okLignerFeil({ ...standardLys, ...lyse })).toEqual([]);
    expect(okLignerFeil({ ...standardMork, ...lyse, ...morke })).toEqual([]);
  });
});

describe('Torderød skole', () => {
  // Skolens nettside har røde overskrifter, så h1 og h2 skal være røde også her.
  it('har røde overskrifter i lys og mørk modus', () => {
    const lyse = variabler(blokk('html[data-skole="torderod"]', skolecss));
    const morke = variabler(blokk('html[data-skole="torderod"][data-theme="dark"]', skolecss));
    for (const farge of [lyse['--bk-overskrift'], morke['--bk-overskrift']]) {
      const [, metning, tone] = lch(kanaler(farge).slice(0, 3));
      expect(metning, farge).toBeGreaterThan(15);
      expect(tone < 45 || tone > 340, `${farge}: fargetone ${Math.round(tone)}°`).toBe(true);
    }
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

  it.each(temaer)('har lesbart navn (%s)', (_, tema) => {
    const farger = { ...navn, ...tema };
    const tekst = tekstfarge(".oppsettvalg[aria-pressed='true'] .oppsettvalg-navn") ?? tekstfarge('.oppsettvalg-navn') ?? 'var(--tekst)';
    const kort = los('var(--flate)', farger);
    const bakgrunn = leggOver(los('var(--aksent-lys)', farger), kort);
    expect(kontrast(los(tekst, farger), bakgrunn)).toBeGreaterThanOrEqual(4.5);
  });
});
