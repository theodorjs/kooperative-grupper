import { useState } from 'react';
import { aktivtKlassekart, elevlisteForKart, oppdaterInnstillinger } from '../data/operasjoner.js';
import {
  ferieForUke,
  flyttRotasjonStart,
  lagRolleoversikt,
  ROLLENUMRE,
  ROLLER,
  ukeforskyvning,
} from '../logikk/roller.js';
import { iDag, leggTilDager, mandagForDato, ukeoverskrift } from '../logikk/uke.js';
import Ikon from './Ikon.jsx';

function Celle({ elever }) {
  if (elever.length === 0) return <td />;
  return (
    <td>
      {elever.map((e) => (
        <div key={e.plass} className={e.navn ? 'rollenavn' : 'rollenavn tom'}>
          {e.navn ?? '–'}
          {e.navn && e.flereRoller && <span className="stjerne">*</span>}
        </div>
      ))}
    </td>
  );
}

export default function Rolleoversikt({ data, endre, gaTil }) {
  const [ukeforskyvningVisning, setUkeforskyvningVisning] = useState(0);
  const kart = aktivtKlassekart(data);
  const liste = elevlisteForKart(data, kart);
  const { rotasjonStart, ferier } = data.innstillinger;

  const mandag = leggTilDager(mandagForDato(iDag()), 7 * ukeforskyvningVisning);
  const ferie = ferieForUke(mandag, ferier);
  const k = ukeforskyvning(rotasjonStart, mandag, ferier);
  const rader = kart && liste ? lagRolleoversikt(kart, liste.elever, k) : [];
  const harFlereRoller = rader.some((r) => ROLLENUMRE.some((n) => r.celler[n].some((c) => c.navn && c.flereRoller)));
  const tettere = rader.reduce((sum, r) => sum + Math.max(...ROLLENUMRE.map((n) => r.celler[n].length || 1)), 0) > 9;

  const juster = (steg) =>
    endre((d) =>
      oppdaterInnstillinger(d, {
        rotasjonStart: flyttRotasjonStart(d.innstillinger.rotasjonStart, mandag, d.innstillinger.ferier, steg),
      }),
    );

  return (
    <div className="rolleside">
      <style>{'@page { size: A4 landscape; margin: 10mm; }'}</style>

      <div className="ukenavigasjon ikke-utskrift">
        <button type="button" onClick={() => setUkeforskyvningVisning((n) => n - 1)}>
          <Ikon navn="venstre" /> Forrige uke
        </button>
        <button type="button" onClick={() => setUkeforskyvningVisning(0)} disabled={ukeforskyvningVisning === 0}>
          Denne uka
        </button>
        <button type="button" onClick={() => setUkeforskyvningVisning((n) => n + 1)}>
          Neste uke <Ikon navn="hoyre" />
        </button>
      </div>

      <section className="kort rollekort">
        <h1 className="ukeoverskrift">{ukeoverskrift(mandag)}</h1>

        {!kart && (
          <p>
            Det er ikke noe aktivt klassekart ennå.{' '}
            <button type="button" className="lenkeknapp" onClick={() => gaTil('kart')}>
              Gå til Klassekart
            </button>
          </p>
        )}

        {kart && ferie && (
          <div className="ferie">
            <p className="ferietittel">Ferie</p>
            <p>{ferie.navn}. Rotasjonen står stille denne uka. Uka etter ferien får elevene nye roller.</p>
          </div>
        )}

        {kart && !ferie && (
          <>
            <table className={`rolletabell${tettere ? ' tett' : ''}`}>
              <thead>
                <tr>
                  {ROLLENUMRE.map((n) => (
                    <th key={n} style={{ background: ROLLER[n].farge }} scope="col">
                      <span className="rollenummer">{n}</span> {ROLLER[n].navn}
                      {ROLLER[n].tillegg && <span className="rolletillegg"> {ROLLER[n].tillegg}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rader.map((rad) => (
                  <tr key={rad.gruppeId}>
                    {ROLLENUMRE.map((n) => (
                      <Celle key={n} elever={rad.celler[n]} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {rader.length === 0 && <p className="dempet">Klassekartet har ingen bordgrupper.</p>}
            {harFlereRoller && (
              <p className="fotnote">* Har to eller flere roller denne uka fordi gruppa har færre enn fire elever.</p>
            )}
          </>
        )}
      </section>

      {kart && (
        <div className="rollebunn ikke-utskrift">
          <button type="button" onClick={() => window.print()} disabled={Boolean(ferie)}>
            <Ikon navn="skriver" /> Skriv ut rolleoversikt
          </button>
          <span className="dempet liten">Bygger på klassekartet «{kart.navn}».</span>
          <span className="liten">Juster rotasjonen:</span>
          <button type="button" onClick={() => juster(-1)}>
            Én uke tilbake
          </button>
          <button type="button" onClick={() => juster(1)}>
            Én uke frem
          </button>
        </div>
      )}
    </div>
  );
}
