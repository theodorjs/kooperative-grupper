import { describe, expect, it } from 'vitest';
import { brukImporterteFerier, settFerieimport, tolkFeriefil } from './ferieimport.js';
import { tolkImport } from './lagring.js';
import { lagStandarddata } from './standarddata.js';

const fil = {
  kilde: 'https://example.invalid',
  hentet: '2026-10-05',
  ferier: [
    { navn: 'Høstferie', fra: '2026-09-28', til: '2026-10-02' },
    { navn: 'Juleferie', fra: '2026-12-21', til: '2027-01-01' },
  ],
};

function medEgenFerie() {
  const data = lagStandarddata('2026-10-07');
  data.innstillinger.ferier.push({ id: 'egen', navn: 'Turdag', fra: '2026-11-02', til: '2026-11-06' });
  return data;
}

describe('feriefila', () => {
  it('godtar gyldige filer og fjerner ugyldige ferier', () => {
    const tolket = tolkFeriefil({ ...fil, ferier: [...fil.ferier, { navn: 'Feil', fra: '2026-10-10', til: '2026-10-01' }] });
    expect(tolket.ferier).toHaveLength(2);
  });

  it('ser bort fra fila før den er hentet første gang', () => {
    expect(tolkFeriefil({ kilde: 'x', hentet: null, ferier: [] })).toBeNull();
    expect(tolkFeriefil(null)).toBeNull();
  });
});

describe('bruke importerte ferier', () => {
  it('legger til importerte ferier og beholder ferier læreren har lagt inn selv', () => {
    const data = brukImporterteFerier(medEgenFerie(), tolkFeriefil(fil));
    expect(data.innstillinger.ferier.map((f) => f.navn)).toEqual(['Turdag', 'Høstferie', 'Juleferie']);
    expect(data.innstillinger.ferier.filter((f) => f.kilde === 'moss')).toHaveLength(2);
    expect(data.innstillinger.ferieimport.hentet).toBe('2026-10-05');
  });

  it('erstatter gamle importerte ferier når kommunen endrer skoleruta', () => {
    let data = brukImporterteFerier(medEgenFerie(), tolkFeriefil(fil));
    data = brukImporterteFerier(data, {
      hentet: '2026-10-12',
      ferier: [{ navn: 'Høstferie', fra: '2026-10-05', til: '2026-10-09' }],
    });
    expect(data.innstillinger.ferier.map((f) => `${f.navn} ${f.fra}`)).toEqual(['Turdag 2026-11-02', 'Høstferie 2026-10-05']);
  });

  it('gir samme objekt tilbake når ingenting er endret', () => {
    const data = brukImporterteFerier(medEgenFerie(), tolkFeriefil(fil));
    expect(brukImporterteFerier(data, tolkFeriefil(fil))).toBe(data);
  });

  it('gjør ingenting når importen er slått av, og fjerner importerte ferier ved avslåing', () => {
    const importert = brukImporterteFerier(medEgenFerie(), tolkFeriefil(fil));
    const av = settFerieimport(importert, false);
    expect(av.innstillinger.ferier.map((f) => f.navn)).toEqual(['Turdag']);
    expect(brukImporterteFerier(av, tolkFeriefil(fil))).toBe(av);
  });

  it('tar med importerte ferier og innstillingen i eksport og import', () => {
    const data = brukImporterteFerier(medEgenFerie(), tolkFeriefil(fil));
    expect(tolkImport(JSON.stringify(data))).toEqual(data);
  });

  it('slår på import for data lagret før funksjonen fantes', () => {
    const gammel = lagStandarddata();
    delete gammel.innstillinger.ferieimport;
    expect(tolkImport(JSON.stringify(gammel)).innstillinger.ferieimport).toEqual({ aktiv: true, hentet: null });
  });
});
