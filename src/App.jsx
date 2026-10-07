import { useCallback, useEffect, useState } from 'react';
import { brukImporterteFerier, hentImporterteFerier } from './data/ferieimport.js';
import { lesData, skrivData } from './data/lagring.js';
import Elevlister from './komponenter/Elevlister.jsx';
import Innstillinger from './komponenter/Innstillinger.jsx';
import Klassekart from './komponenter/Klassekart.jsx';
import Oppstart from './komponenter/Oppstart.jsx';
import Rolleoversikt from './komponenter/Rolleoversikt.jsx';

const FANER = [
  { id: 'uka', navn: 'Denne uka' },
  { id: 'kart', navn: 'Klassekart' },
  { id: 'elever', navn: 'Elever' },
  { id: 'innstillinger', navn: 'Innstillinger' },
];

export default function App() {
  const [data, setData] = useState(() => lesData());
  const [fane, setFane] = useState('uka');
  const [lagringFeilet, setLagringFeilet] = useState(false);

  useEffect(() => {
    setLagringFeilet(!skrivData(data));
  }, [data]);

  const endre = useCallback((endring) => setData((d) => endring(d)), []);
  const erstatt = useCallback((nyData) => setData(nyData), []);

  // Henter ferier fra skoleruta (fila ligger ved siden av appen, se ferieimport.js).
  const ferieimportAktiv = data.innstillinger.ferieimport.aktiv;
  useEffect(() => {
    if (!ferieimportAktiv) return undefined;
    let avbrutt = false;
    hentImporterteFerier().then((resultat) => {
      if (resultat && !avbrutt) endre((d) => brukImporterteFerier(d, resultat));
    });
    return () => {
      avbrutt = true;
    };
  }, [ferieimportAktiv, endre]);

  const harElever = data.elevlister.length > 0;

  return (
    <div className="app">
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
                  onClick={() => setFane(f.id)}
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
          Kunne ikke lagre i nettleseren. Endringene dine kan gå tapt. Last ned data under Innstillinger for å ta en kopi.
        </p>
      )}

      <main className="side">
        {!harElever && (
          <Oppstart
            endre={endre}
            erstatt={erstatt}
            onFerdig={() => setFane('kart')}
          />
        )}
        {harElever && fane === 'uka' && <Rolleoversikt data={data} endre={endre} gaTil={setFane} />}
        {harElever && fane === 'kart' && <Klassekart data={data} endre={endre} />}
        {harElever && fane === 'elever' && <Elevlister data={data} endre={endre} />}
        {harElever && fane === 'innstillinger' && <Innstillinger data={data} endre={endre} erstatt={erstatt} />}
      </main>
    </div>
  );
}
