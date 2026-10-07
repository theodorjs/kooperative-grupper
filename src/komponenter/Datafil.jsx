import { useRef, useState } from 'react';
import { DataFeil, lastNedData, tolkImport } from '../data/lagring.js';

export function EksportKnapp({ data }) {
  return (
    <button type="button" onClick={() => lastNedData(data)}>
      Last ned data
    </button>
  );
}

/** Leser en JSON-fil lokalt og erstatter alle data etter bekreftelse. */
export function ImportKnapp({ erstatt, harData, tekst = 'Importer data' }) {
  const filvelger = useRef(null);
  const [feil, setFeil] = useState(null);

  async function lesFil(e) {
    const fil = e.target.files?.[0];
    e.target.value = '';
    if (!fil) return;
    setFeil(null);
    try {
      const data = tolkImport(await fil.text());
      if (
        harData &&
        !window.confirm('Importen erstatter alle elevlister, klassekart og innstillinger i denne nettleseren. Vil du fortsette?')
      ) {
        return;
      }
      erstatt(data);
    } catch (err) {
      setFeil(err instanceof DataFeil ? err.message : 'Kunne ikke lese filen.');
    }
  }

  return (
    <>
      <button type="button" onClick={() => filvelger.current?.click()}>
        {tekst}
      </button>
      <input ref={filvelger} type="file" accept="application/json,.json" hidden onChange={lesFil} />
      {feil && (
        <p className="varsel feil" role="alert">
          {feil}
        </p>
      )}
    </>
  );
}
