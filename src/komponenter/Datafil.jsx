import { useRef, useState } from 'react';
import { delEllerLastNed, delingsfilnavn, klasseTilDeling } from '../data/deling.js';
import { importmelding, importsporsmal, slaSammen, tolkImportfil } from '../data/import.js';
import { DataFeil, lagDatafil, lastNedBackup, lastNedFil } from '../data/lagring.js';
import { aktivElevliste } from '../data/operasjoner.js';
import Ikon from './Ikon.jsx';

// Knappene står i et rutenett i Innstillinger: knappen til venstre, forklaringen
// (children) til høyre, og meldinger under, over hele bredden.

/** Sender én klasse til en kollega med delingsmenyen (AirDrop på iPad). */
export function DelKlasseKnapp({ data, children }) {
  const [valgtId, setValgtId] = useState(null);
  const [venter, setVenter] = useState(false);
  const [melding, setMelding] = useState(null);
  const liste = data.elevlister.find((l) => l.id === valgtId) ?? aktivElevliste(data) ?? data.elevlister[0];

  function del() {
    if (!liste || venter) return;
    setMelding(null);
    // Fila lages og delingsmenyen åpnes i samme trykk, uten å vente på noe først.
    const fil = lagDatafil(klasseTilDeling(data, liste.id), delingsfilnavn(liste.navn));
    const resultat = delEllerLastNed(fil, { lastNed: lastNedFil });
    setVenter(true);
    resultat
      .then((utfall) => {
        if (utfall === 'lastet-ned') {
          setMelding(
            'Delingsmenyen er ikke tilgjengelig i denne nettleseren, så fila ble lastet ned. Send den til kollegaen på en annen måte.',
          );
        }
      })
      .catch(() => setMelding('Kunne ikke lage fila.'))
      .finally(() => setVenter(false));
  }

  const flereKlasser = data.elevlister.length > 1;

  return (
    <div className={flereKlasser ? 'datavalg-rad med-valg' : 'datavalg-rad'}>
      <button type="button" onClick={del} disabled={!liste || venter}>
        <Ikon navn="airdrop" storrelse={22} /> AirDrop til en kollega
      </button>
      <div className="datavalg-hjelp">
        {flereKlasser && (
          <label className="datavalg-klasse">
            Klasse som deles
            <select
              value={liste?.id ?? ''}
              onChange={(e) => {
                setValgtId(e.target.value);
                setMelding(null);
              }}
            >
              {data.elevlister.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.navn}
                </option>
              ))}
            </select>
          </label>
        )}
        <p className="dempet liten">{children}</p>
      </div>
      {melding && (
        <p className="varsel" role="status">
          {melding}
        </p>
      )}
    </div>
  );
}

/** Laster ned alle data i én fil. */
export function BackupKnapp({ data, children }) {
  return (
    <div className="datavalg-rad">
      <button type="button" onClick={() => lastNedBackup(data)}>
        <Ikon navn="nedlasting" storrelse={22} /> Last ned en backup
      </button>
      <div className="datavalg-hjelp">
        <p className="dempet liten">{children}</p>
      </div>
    </div>
  );
}

/**
 * Leser en fil lokalt og legger klassene i den inn som nye klasser, etter
 * bekreftelse. Uten klasser fra før (startsiden) legges fila inn uten spørsmål.
 */
export function ImportKnapp({ data, endre, children }) {
  const filvelger = useRef(null);
  const [feil, setFeil] = useState(null);
  const [melding, setMelding] = useState(null);

  async function lesFil(e) {
    const fil = e.target.files?.[0];
    e.target.value = '';
    if (!fil) return;
    setFeil(null);
    setMelding(null);
    try {
      const { data: importert, erBackup } = tolkImportfil(await fil.text());
      if (importert.elevlister.length === 0) {
        setFeil('Fila inneholder ingen klasser.');
        return;
      }
      if (data.elevlister.length > 0 && !window.confirm(importsporsmal(data, importert))) return;
      endre((d) => slaSammen(d, importert, { erBackup }));
      setMelding(importmelding(importert));
    } catch (err) {
      setFeil(err instanceof DataFeil ? err.message : 'Kunne ikke lese filen.');
    }
  }

  const knapp = (
    <button type="button" onClick={() => filvelger.current?.click()}>
      <Ikon navn="fil" storrelse={children ? 22 : 16} /> Importer fra fil
    </button>
  );
  const meldinger = (
    <>
      <input ref={filvelger} type="file" accept="application/json,.json" hidden onChange={lesFil} />
      {feil && (
        <p className="varsel feil" role="alert">
          {feil}
        </p>
      )}
      {melding && (
        <p className="varsel ok" role="status">
          {melding}
        </p>
      )}
    </>
  );

  if (!children) {
    return (
      <>
        {knapp}
        {meldinger}
      </>
    );
  }
  return (
    <div className="datavalg-rad">
      {knapp}
      <div className="datavalg-hjelp">
        <p className="dempet liten">{children}</p>
      </div>
      {meldinger}
    </div>
  );
}
