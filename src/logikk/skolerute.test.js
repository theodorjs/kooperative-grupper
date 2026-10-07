import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { htmlTilTekst, tolkSkolerute } from './skolerute.js';

const lesTestdata = (navn) => readFileSync(new URL(`./testdata/${navn}`, import.meta.url), 'utf8');

const kort = (ferier) => ferier.map((f) => `${f.navn} ${f.fra} ${f.til}`);

describe('HTML til tekst', () => {
  it('lager én linje per avsnitt og tabellrad, og dekoder tegn', () => {
    const html = '<h2>Skoleåret 2026&ndash;2027</h2><table><tr><td>H&oslash;stferie</td><td>28.&nbsp;sept.</td></tr></table><script>x()</script>';
    expect(htmlTilTekst(html).split('\n')).toEqual(['Skoleåret 2026–2027', 'Høstferie 28. sept.']);
  });
});

describe('skoleruta til Moss kommune 2026–2027', () => {
  const tekst = lesTestdata('moss-2026-2027.txt');

  it('finner høst-, jule-, vinter- og påskeferien', () => {
    expect(kort(tolkSkolerute(tekst))).toEqual([
      'Høstferie 2026-09-28 2026-10-02',
      'Juleferie 2026-12-21 2027-01-03',
      'Vinterferie 2027-02-22 2027-02-26',
      'Påskeferie 2027-03-22 2027-03-29',
    ]);
  });

  it('gir samme resultat når teksten står i HTML', () => {
    const html = `<h2>${tekst.split('\n')[0]}</h2><ul>${tekst
      .split('\n')
      .filter((l) => l.startsWith('- '))
      .map((l) => `<li>${l.slice(2)}</li>`)
      .join('')}</ul>`;
    expect(tolkSkolerute(html)).toEqual(tolkSkolerute(tekst));
  });
});

describe('nettsiden til Moss kommune', () => {
  // Linjene er hentet fra diagnosen i GitHub Actions 7. oktober 2026.
  const tekst = lesTestdata('moss-nettside-utdrag.txt');

  it('leser datoer som står foran ferienavnet', () => {
    expect(kort(tolkSkolerute(tekst, { dato: '2026-10-07' }))).toEqual([
      'Høstferie 2026-09-28 2026-10-02',
      'Vinterferie 2027-02-22 2027-02-26',
      'Påskeferie 2027-03-22 2027-03-29',
    ]);
  });

  it('lager juleferie av siste skoledag før jul og første skoledag etter jul', () => {
    const medJul = `${tekst}\nDesember 18.12 fredag Siste skoledag før jul\nJanuar 04.01 mandag Første skoledag etter jul`;
    expect(kort(tolkSkolerute(medJul, { dato: '2026-10-07' }))).toContain('Juleferie 2026-12-19 2027-01-03');
  });

  it('bruker neste skoleår når siden uten årstall ellers bare ville gitt ferier i fortiden', () => {
    expect(kort(tolkSkolerute(tekst, { dato: '2027-06-20' }))[0]).toBe('Høstferie 2027-09-28 2027-10-02');
  });
});

describe('tolke skolerute', () => {
  it('leser flere ferier med datoene foran på samme linje', () => {
    const tekst = 'Skoleåret 2026/2027\n(28.09-02.10) Høstferie (22.02 - 26.02) Vinterferie';
    expect(kort(tolkSkolerute(tekst))).toEqual([
      'Høstferie 2026-09-28 2026-10-02',
      'Vinterferie 2027-02-22 2027-02-26',
    ]);
  });


  it('leser datoer uten punktum etter måneden, som "28.09–02.10.2026"', () => {
    expect(kort(tolkSkolerute('Skoleåret 2026/2027\nPåskeferie: 22.03–29.03.2027'))).toEqual([
      'Påskeferie 2027-03-22 2027-03-29',
    ]);
  });

  it('bruker ikke "siste skoledag" som sluttdato for en ferie', () => {
    expect(tolkSkolerute('Skoleåret 2026/2027\nSommerferie: fra 18.06.2027 (siste skoledag 17.06)')).toEqual([]);
  });

  it('tolker ikke klokkeslett som datoer', () => {
    expect(tolkSkolerute('Skoleåret 2026/2027\nHøstferie: skolen stenger kl. 12.30, se egen oversikt')).toEqual([]);
  });


  it('leser en liste med tekstlige datoer og henter årstall fra skoleåret', () => {
    const html = `
      <h2>Skolerute 2026/2027</h2>
      <ul>
        <li>Første skoledag: 17. august</li>
        <li>Høstferie: 28. september – 2. oktober</li>
        <li>Planleggingsdag: 13. november</li>
        <li>Juleferie: 21. desember – 1. januar</li>
        <li>Vinterferie: 22. – 26. februar</li>
        <li>Påskeferie: 22. – 26. mars</li>
        <li>Siste skoledag: 18. juni</li>
      </ul>`;
    expect(kort(tolkSkolerute(html))).toEqual([
      'Høstferie 2026-09-28 2026-10-02',
      'Juleferie 2026-12-21 2027-01-01',
      'Vinterferie 2027-02-22 2027-02-26',
      'Påskeferie 2027-03-22 2027-03-26',
    ]);
  });

  it('leser tabeller med numeriske datoer', () => {
    const html = `
      <table>
        <tr><th>Ferie</th><th>Fra</th><th>Til</th></tr>
        <tr><td>Høstferie</td><td>28.09.2026</td><td>02.10.2026</td></tr>
        <tr><td>Juleferie</td><td>21.12.26</td><td>1.1.27</td></tr>
      </table>`;
    expect(kort(tolkSkolerute(html))).toEqual([
      'Høstferie 2026-09-28 2026-10-02',
      'Juleferie 2026-12-21 2027-01-01',
    ]);
  });

  it('leser ukenumre', () => {
    const tekst = 'Skoleåret 2026-27\nHøstferie uke 40\nVinterferie: uke 8';
    expect(kort(tolkSkolerute(tekst))).toEqual([
      'Høstferie 2026-09-28 2026-10-02',
      'Vinterferie 2027-02-22 2027-02-26',
    ]);
  });

  it('regner ferien fra dagen etter siste skoledag til dagen før første skoledag', () => {
    const tekst = 'Skoleåret 2026–2027\nJuleferie: Siste skoledag før jul er 18. desember, første skoledag etter jul er 4. januar.';
    expect(kort(tolkSkolerute(tekst))).toEqual(['Juleferie 2026-12-19 2027-01-03']);
  });

  it('leser datoer som står på linja under overskriften', () => {
    const html = '<p>Skoleåret 2026/2027</p><h3>Høstferie</h3><p>Mandag 28. september til fredag 2. oktober</p><h3>Juleferie</h3><p>21. desember til 1. januar</p>';
    expect(kort(tolkSkolerute(html))).toEqual([
      'Høstferie 2026-09-28 2026-10-02',
      'Juleferie 2026-12-21 2027-01-01',
    ]);
  });

  it('forstår "28.–2. oktober" der første dag er i måneden før', () => {
    expect(kort(tolkSkolerute('Skoleåret 2026/2027\nHøstferie 28.–2. oktober'))).toEqual([
      'Høstferie 2026-09-28 2026-10-02',
    ]);
  });

  it('leser flere ferier på samme linje og flere skoleår', () => {
    const tekst = 'Skoleåret 2026/2027: Høstferie 28.9.–2.10. Vinterferie 22.2.–26.2.\nSkoleåret 2027/2028: Høstferie 4.10.–8.10.';
    expect(kort(tolkSkolerute(tekst))).toEqual([
      'Høstferie 2026-09-28 2026-10-02',
      'Vinterferie 2027-02-22 2027-02-26',
      'Høstferie 2027-10-04 2027-10-08',
    ]);
  });

  it('bruker årstall som står i datoene når skoleåret mangler', () => {
    expect(kort(tolkSkolerute('Juleferie 21. desember 2026 – 1. januar 2027'))).toEqual([
      'Juleferie 2026-12-21 2027-01-01',
    ]);
  });

  it('hopper over ferier uten tolkbare datoer, enkeltdager og urimelig lange perioder', () => {
    const tekst = 'Skoleåret 2026/2027\nHøstferie: se kalenderen\nVinterferie starter 22. februar\nSommerferie 19. juni – 31. desember';
    expect(tolkSkolerute(tekst)).toEqual([]);
  });

  it('kobler ikke en ferie uten datoer til datoer for noe annet på linja under', () => {
    const tekst = 'Skoleåret 2026/2027\nPåskeferie\nPlanleggingsdager 13. november og 4. januar';
    expect(tolkSkolerute(tekst)).toEqual([]);
  });

  it('fjerner like ferier som står flere steder på siden', () => {
    const tekst = 'Skoleåret 2026/2027\nHøstferie 28.9.–2.10.\nHøstferie: 28. september – 2. oktober';
    expect(tolkSkolerute(tekst)).toHaveLength(1);
  });
});
