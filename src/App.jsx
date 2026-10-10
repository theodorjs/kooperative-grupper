import { useCallback, useEffect, useState } from 'react';
import { brukImporterteFerier, hentImporterteFerier } from './data/ferieimport.js';
import { lesData, skrivData } from './data/lagring.js';
import Bunntekst from './komponenter/Bunntekst.jsx';
import Elevlister from './komponenter/Elevlister.jsx';
import Innstillinger from './komponenter/Innstillinger.jsx';
import Klassekart from './komponenter/Klassekart.jsx';
import Oppstart from './komponenter/Oppstart.jsx';
import Rollene from './komponenter/Rollene.jsx';
import Rolleoversikt from './komponenter/Rolleoversikt.jsx';

const FANER = [
  { id: 'uka', navn: 'Denne uka' },
  { id: 'kart', navn: 'Klassekart' },
  { id: 'elever', navn: 'Elever' },
  { id: 'roller', navn: 'Rollene' },
  { id: 'innstillinger', navn: 'Innstillinger' },
];

export default function App() {
  const [data, setData] = useState(() => lesData());
  const [fane, setFane] = useState('uka');
  const [lagringFeilet, setLagringFeilet] = useState(false);
  // Bekreftelsen etter en import står her, så den ikke forsvinner med startsiden.
  const [importmelding, setImportmelding] = useState(null);
  // Eksempelklassen fra startsiden. Mens den vises, lagres ingenting.
  const [eksempel, setEksempel] = useState(null);

  useEffect(() => {
    setLagringFeilet(!skrivData(data));
  }, [data]);

  const endreLagret = useCallback((endring) => setData((d) => endring(d)), []);
  const endreEksempel = useCallback((endring) => setEksempel((d) => endring(d)), []);
  const vist = eksempel ?? data;
  const endre = eksempel ? endreEksempel : endreLagret;

  const velgFane = useCallback((id) => {
    setFane(id);
    setImportmelding(null);
  }, []);

  const visImportmelding = useCallback((melding) => {
    setImportmelding(melding);
    // Meldingen står øverst; importknappen i Innstillinger står langt nede.
    window.scrollTo(0, 0);
  }, []);

  // Henter ferier fra skoleruta (fila ligger ved siden av appen, se ferieimport.js).
  const ferieimportAktiv = data.innstillinger.ferieimport.aktiv;
  useEffect(() => {
    if (!ferieimportAktiv) return undefined;
    let avbrutt = false;
    hentImporterteFerier().then((resultat) => {
      if (resultat && !avbrutt) endreLagret((d) => brukImporterteFerier(d, resultat));
    });
    return () => {
      avbrutt = true;
    };
  }, [ferieimportAktiv, endreLagret]);

  const harElever = vist.elevlister.length > 0;

  function utforsk(eksempeldata) {
    setEksempel(eksempeldata);
    setFane('kart');
    window.scrollTo(0, 0);
  }

  function avsluttEksempel() {
    setEksempel(null);
    setFane('uka');
    window.scrollTo(0, 0);
  }

  return (
    <div className={eksempel ? 'app eksempelmodus' : 'app'}>
      <header className="topp ikke-utskrift">
        <div className="topp-innhold">
          <h1 className="apptittel">Kooperative grupper</h1>
          {harElever && (
            <nav className="faner" aria-label="Hovedmeny">
              {FANER.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="fane"
                  aria-current={fane === f.id ? 'page' : undefined}
                  onClick={() => velgFane(f.id)}
                >
                  {f.navn}
                </button>
              ))}
            </nav>
          )}
        </div>
      </header>

      {lagringFeilet && (
        <p className="varsel feil ikke-utskrift" role="alert">
          Kunne ikke lagre i nettleseren. Endringene dine kan gå tapt. Trykk «Last ned en backup» under Innstillinger for å
          ta en kopi.
        </p>
      )}

      {eksempel && (
        <p className="varsel eksempelbanner ikke-utskrift" role="status">
          <span>
            <strong>Du utforsker en eksempelklasse.</strong> Prøv deg fram – ingenting lagres.
          </span>
          <button type="button" className="hoved" onClick={avsluttEksempel}>
            Lag din egen klasse
          </button>
        </p>
      )}

      <main className="side">
        {importmelding && (
          <p className="varsel ok importmelding ikke-utskrift" role="status">
            <span>{importmelding}</span>
            <button type="button" className="lenkeknapp" onClick={() => setImportmelding(null)}>
              Lukk
            </button>
          </p>
        )}
        {!harElever && (
          <Oppstart
            data={data}
            endre={endre}
            onFerdig={() => velgFane('kart')}
            onImportert={visImportmelding}
            onUtforsk={utforsk}
          />
        )}
        {harElever && fane === 'uka' && <Rolleoversikt data={vist} endre={endre} gaTil={velgFane} />}
        {harElever && fane === 'kart' && <Klassekart data={vist} endre={endre} />}
        {harElever && fane === 'elever' && <Elevlister data={vist} endre={endre} />}
        {harElever && fane === 'roller' && <Rollene data={vist} endre={endre} />}
        {harElever && fane === 'innstillinger' && (
          <Innstillinger data={vist} endre={endre} onImportert={visImportmelding} />
        )}
      </main>

      <Bunntekst />
    </div>
  );
}
