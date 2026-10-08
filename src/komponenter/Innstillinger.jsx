import { useState } from 'react';
import { FERIEKILDE, settFerieimport } from '../data/ferieimport.js';
import { brukFargetema, lagreFargetema, lesFargetema } from '../data/fargetema.js';
import { nyId } from '../data/id.js';
import { oppdaterInnstillinger } from '../data/operasjoner.js';
import { flyttRotasjonStart } from '../logikk/roller.js';
import { erGyldigDato, formaterDato, iDag, mandagForDato, ukeoverskrift } from '../logikk/uke.js';
import { EksportKnapp, ImportKnapp } from './Datafil.jsx';

function Tallfelt({ verdi, min, max, steg, onEndre, ...rest }) {
  const [utkast, setUtkast] = useState(String(verdi));
  function lagre() {
    const tall = Number(utkast.replace(',', '.'));
    if (Number.isFinite(tall) && tall >= min && tall <= max) onEndre(tall);
    else setUtkast(String(verdi));
  }
  return (
    <input
      type="number"
      inputMode="decimal"
      min={min}
      max={max}
      step={steg}
      value={utkast}
      onChange={(e) => setUtkast(e.target.value)}
      onBlur={lagre}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      {...rest}
    />
  );
}

const FARGEVALG = [
  { verdi: 'lys', navn: 'Lys' },
  { verdi: 'mork', navn: 'Mørk' },
  { verdi: 'auto', navn: 'Automatisk' },
];

function Fargevalg() {
  const [valgt, setValgt] = useState(lesFargetema);

  function velg(valg) {
    setValgt(valg);
    lagreFargetema(valg);
    brukFargetema(valg);
  }

  return (
    <section className="kort">
      <h2>Fargevalg</h2>
      <div className="segment" role="group" aria-label="Fargevalg">
        {FARGEVALG.map((f) => (
          <button key={f.verdi} type="button" aria-pressed={valgt === f.verdi} onClick={() => velg(f.verdi)}>
            {f.navn}
          </button>
        ))}
      </div>
      <p className="dempet liten fargevalg-hjelp">
        Automatisk følger innstillingen på maskinen. Valget gjelder bare denne nettleseren. Utskrifter blir alltid lyse.
      </p>
    </section>
  );
}

function Ferier({ ferier, onEndre }) {
  const [navn, setNavn] = useState('');
  const [fra, setFra] = useState('');
  const [til, setTil] = useState('');
  const gyldig = erGyldigDato(fra) && erGyldigDato(til) && fra <= til;

  function leggTil(e) {
    e.preventDefault();
    if (!gyldig) return;
    onEndre([...ferier, { id: nyId(), navn: navn.trim() || 'Ferie', fra, til }]);
    setNavn('');
    setFra('');
    setTil('');
  }

  const sortert = [...ferier].sort((a, b) => a.fra.localeCompare(b.fra));

  return (
    <>
      {sortert.length > 0 ? (
        <table className="enkel-tabell">
          <thead>
            <tr>
              <th scope="col">Navn</th>
              <th scope="col">Fra</th>
              <th scope="col">Til</th>
              <th scope="col">Kilde</th>
              <th scope="col"><span className="skjult">Handling</span></th>
            </tr>
          </thead>
          <tbody>
            {sortert.map((f) => (
              <tr key={f.id}>
                <td>{f.navn}</td>
                <td>{formaterDato(f.fra, true)}</td>
                <td>{formaterDato(f.til, true)}</td>
                <td className="dempet">{f.kilde === FERIEKILDE.id ? FERIEKILDE.navn : 'Lagt inn selv'}</td>
                <td>
                  {f.kilde !== FERIEKILDE.id && (
                    <button
                      type="button"
                      className="lenkeknapp fare"
                      onClick={() => onEndre(ferier.filter((x) => x.id !== f.id))}
                    >
                      Slett
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="dempet">Ingen ferier lagt inn.</p>
      )}

      <form className="ferieskjema" onSubmit={leggTil}>
        <label>
          Navn
          <input type="text" value={navn} onChange={(e) => setNavn(e.target.value)} placeholder="For eksempel Høstferie" />
        </label>
        <label>
          Fra
          <input type="date" value={fra} onChange={(e) => setFra(e.target.value)} />
        </label>
        <label>
          Til
          <input type="date" value={til} min={fra || undefined} onChange={(e) => setTil(e.target.value)} />
        </label>
        <button type="submit" disabled={!gyldig}>
          Legg til ferie
        </button>
      </form>
      {fra && til && fra > til && <p className="varsel feil">Til-datoen må være etter fra-datoen.</p>}
    </>
  );
}

export default function Innstillinger({ data, endre, erstatt }) {
  const inn = data.innstillinger;
  const sett = (endring) => endre((d) => oppdaterInnstillinger(d, endring));
  const idag = iDag();

  const juster = (steg) =>
    endre((d) =>
      oppdaterInnstillinger(d, {
        rotasjonStart: flyttRotasjonStart(d.innstillinger.rotasjonStart, idag, d.innstillinger.ferier, steg),
      }),
    );

  return (
    <div className="innstillinger">
      <Fargevalg />
      <section className="kort">
        <h2>Grupper og rom</h2>
        <div className="skjema rutenett">
          <label>
            Ønsket gruppestørrelse
            <select
              value={inn.onsketGruppestorrelse}
              onChange={(e) => sett({ onsketGruppestorrelse: Number(e.target.value) })}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label>
            Rommets bredde (meter, tavleveggen)
            <Tallfelt
              key={`b${inn.rom.bredde}`}
              verdi={inn.rom.bredde}
              min={3}
              max={30}
              steg={0.5}
              onEndre={(bredde) => sett({ rom: { ...inn.rom, bredde } })}
            />
          </label>
          <label>
            Rommets lengde (meter)
            <Tallfelt
              key={`l${inn.rom.lengde}`}
              verdi={inn.rom.lengde}
              min={3}
              max={30}
              steg={0.5}
              onEndre={(lengde) => sett({ rom: { ...inn.rom, lengde } })}
            />
          </label>
        </div>
        <p className="dempet liten">
          Gruppestørrelsen brukes når du lager nye klassekart eller trykker «Lag grupper på nytt». Standard rom er 9 × 10
          meter. Bruk «Ordne i rutenett» på klassekartet etter at du har endret romstørrelsen.
        </p>
      </section>

      <section className="kort">
        <h2>Rollerotasjon</h2>
        <div className="skjema rutenett">
          <label>
            Startuke (plass 1 har første rolle)
            <input
              type="date"
              value={inn.rotasjonStart}
              onChange={(e) => erGyldigDato(e.target.value) && sett({ rotasjonStart: mandagForDato(e.target.value) })}
            />
          </label>
        </div>
        <p>
          Startuke: <strong>{ukeoverskrift(inn.rotasjonStart)}</strong>. Rollene bytter hver mandag.
        </p>
        <div className="knapperad">
          <button type="button" onClick={() => juster(-1)}>
            Én uke tilbake
          </button>
          <button type="button" onClick={() => juster(1)}>
            Én uke frem
          </button>
          <span className="dempet liten">Flytter startuka slik at rollene denne uka hopper ett steg.</span>
        </div>
      </section>

      <section className="kort">
        <h2>Ferier</h2>
        <p className="dempet liten">
          Rotasjonen står stille i ferieuker, det vil si uker der minst tre av fem skoledager er ferie. Uka etter ferien
          får elevene nye roller. Enkeltstående fridager, som 2. påskedag eller 17. mai, påvirker ikke rotasjonen.
        </p>
        <div className="ferieimport">
          <label className="avkryssing">
            <input
              type="checkbox"
              checked={inn.ferieimport.aktiv}
              onChange={(e) => endre((d) => settFerieimport(d, e.target.checked))}
            />
            Hent ferier automatisk fra skoleruta til {FERIEKILDE.navn}
          </label>
          {inn.ferieimport.aktiv && (
            <p className="dempet liten">
              {inn.ferieimport.hentet
                ? `Sist oppdatert ${formaterDato(inn.ferieimport.hentet, true)}. `
                : 'Feriene er ikke hentet ennå. De hentes når nettsiden publiseres, og deretter én gang i uka. '}
              <a href={FERIEKILDE.url} target="_blank" rel="noreferrer noopener">
                Se skoleruta hos {FERIEKILDE.navn}
              </a>
              . Sjekk gjerne at datoene stemmer. Ferier du legger inn selv, kommer i tillegg.
            </p>
          )}
        </div>
        <Ferier ferier={inn.ferier} onEndre={(ferier) => sett({ ferier })} />
      </section>

      <section className="kort">
        <h2>Data og personvern</h2>
        <p>
          Alt lagres bare i denne nettleseren på denne maskinen. Appen sender ingenting over nettet. Last ned data for å
          ta sikkerhetskopi, eller for å flytte til en annen maskin eller nettleser.
        </p>
        <div className="knapperad">
          <EksportKnapp data={data} />
          <ImportKnapp erstatt={erstatt} harData />
        </div>
        <p className="dempet liten">
          Filen inneholder elevnavn. Ikke legg den i et delt eller offentlig område.
        </p>
      </section>
    </div>
  );
}
