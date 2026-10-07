import { useState } from 'react';
import {
  aktivElevliste,
  elevensPlassIAktivtKart,
  endreElevlistenavn,
  endreElevnavn,
  fjernElev,
  klassekartForListe,
  leggTilElever,
  opprettElevliste,
  slettElevliste,
  tolkNavneliste,
  velgElevliste,
} from '../data/operasjoner.js';
import { elevordForm } from '../logikk/grupper.js';

const sorterNavn = (a, b) => a.navn.localeCompare(b.navn, 'nb');

function NyElevliste({ endre, onLukk }) {
  const [navn, setNavn] = useState('');
  const [tekst, setTekst] = useState('');
  const elever = tolkNavneliste(tekst);

  function lagre(e) {
    e.preventDefault();
    endre((d) => opprettElevliste(d, navn || 'Ny elevliste', elever));
    onLukk();
  }

  return (
    <form className="kort skjema" onSubmit={lagre}>
      <h3>Ny elevliste</h3>
      <label>
        Navn på lista
        <input type="text" value={navn} onChange={(e) => setNavn(e.target.value)} placeholder="For eksempel 7A" autoFocus />
      </label>
      <label>
        Elever (ett navn per linje)
        <textarea rows={10} value={tekst} onChange={(e) => setTekst(e.target.value)} spellCheck={false} />
      </label>
      <p className="dempet">Det lages også et nytt klassekart for lista.</p>
      <div className="knapperad">
        <button type="submit" className="hoved" disabled={elever.length === 0}>
          Lag elevliste ({elever.length})
        </button>
        <button type="button" onClick={onLukk}>
          Avbryt
        </button>
      </div>
    </form>
  );
}

function Elevrad({ elev, plass, onEndreNavn, onFjern }) {
  const [utkast, setUtkast] = useState(elev.navn);

  function lagre() {
    const rent = utkast.replace(/\s+/g, ' ').trim();
    if (!rent) setUtkast(elev.navn);
    else if (rent !== elev.navn) onEndreNavn(rent);
  }

  return (
    <li className="elevrad">
      <input
        type="text"
        className="navnefelt"
        value={utkast}
        aria-label={`Navn, ${elev.navn}`}
        onChange={(e) => setUtkast(e.target.value)}
        onBlur={lagre}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') {
            setUtkast(elev.navn);
            e.currentTarget.blur();
          }
        }}
      />
      <span className="plassinfo">{plass ? `Gruppe ${plass.gruppe}, plass ${plass.plass}` : 'Uten plass'}</span>
      <button type="button" className="lenkeknapp fare" onClick={onFjern}>
        Fjern
      </button>
    </li>
  );
}

export default function Elevlister({ data, endre }) {
  const liste = aktivElevliste(data);
  const [visNyListe, setVisNyListe] = useState(false);
  const [nyttNavn, setNyttNavn] = useState('');
  const [flereTekst, setFlereTekst] = useState(null);

  function leggTil(e) {
    e.preventDefault();
    const navn = nyttNavn.replace(/\s+/g, ' ').trim();
    if (!navn || !liste) return;
    endre((d) => leggTilElever(d, liste.id, [navn]));
    setNyttNavn('');
  }

  function leggTilFlere() {
    const navn = tolkNavneliste(flereTekst ?? '');
    if (navn.length && liste) endre((d) => leggTilElever(d, liste.id, navn));
    setFlereTekst(null);
  }

  function fjern(elev) {
    const plass = elevensPlassIAktivtKart(data, elev.id);
    const sporsmal = plass
      ? `${elev.navn} sitter på plass ${plass.plass} i gruppe ${plass.gruppe} i det aktive klassekartet. Plassen blir tom. Vil du fjerne eleven fra lista?`
      : `Vil du fjerne ${elev.navn} fra lista?`;
    if (window.confirm(sporsmal)) endre((d) => fjernElev(d, liste.id, elev.id));
  }

  function giNyttNavn() {
    const navn = window.prompt('Nytt navn på elevlisten:', liste.navn);
    if (navn) endre((d) => endreElevlistenavn(d, liste.id, navn));
  }

  function slett(l) {
    const antallKart = klassekartForListe(data, l.id).length;
    const tillegg = antallKart ? ` ${antallKart} klassekart som bygger på lista blir også slettet.` : '';
    if (window.confirm(`Vil du slette elevlisten «${l.navn}»?${tillegg} Dette kan ikke angres.`)) {
      endre((d) => slettElevliste(d, l.id));
    }
  }

  return (
    <div className="elevlister to-kolonner">
      <section className="kort">
        <h2>Elevlister</h2>
        <ul className="listevalg">
          {data.elevlister.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                className="listeknapp"
                aria-pressed={l.id === liste?.id}
                onClick={() => endre((d) => velgElevliste(d, l.id))}
              >
                <span className="listenavn">{l.navn}</span>
                <span className="dempet">
                  {l.elever.length} {elevordForm(l.elever.length)}
                  {l.id === liste?.id ? ' · aktiv' : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {!visNyListe && (
          <button type="button" onClick={() => setVisNyListe(true)}>
            Ny elevliste
          </button>
        )}
        {visNyListe && <NyElevliste endre={endre} onLukk={() => setVisNyListe(false)} />}
        <p className="dempet liten">
          Bruk flere lister når du vil bytte ut hele gruppa, for eksempel ved nytt skoleår. Én liste er aktiv om gangen.
        </p>
      </section>

      {liste && (
        <section className="kort">
          <div className="overskriftsrad">
            <h2>
              {liste.navn} <span className="dempet">({liste.elever.length} {elevordForm(liste.elever.length)})</span>
            </h2>
            <div className="knapperad">
              <button type="button" onClick={giNyttNavn}>
                Gi nytt navn
              </button>
              <button type="button" className="fare" onClick={() => slett(liste)}>
                Slett lista
              </button>
            </div>
          </div>

          <form className="knapperad" onSubmit={leggTil}>
            <input
              type="text"
              value={nyttNavn}
              onChange={(e) => setNyttNavn(e.target.value)}
              placeholder="Navn på ny elev"
              aria-label="Navn på ny elev"
            />
            <button type="submit" disabled={!nyttNavn.trim()}>
              Legg til
            </button>
            {flereTekst === null && (
              <button type="button" onClick={() => setFlereTekst('')}>
                Lim inn flere
              </button>
            )}
          </form>

          {flereTekst !== null && (
            <div className="skjema">
              <label>
                Nye elever (ett navn per linje)
                <textarea rows={6} value={flereTekst} onChange={(e) => setFlereTekst(e.target.value)} autoFocus />
              </label>
              <div className="knapperad">
                <button type="button" className="hoved" onClick={leggTilFlere}>
                  Legg til {tolkNavneliste(flereTekst).length} elever
                </button>
                <button type="button" onClick={() => setFlereTekst(null)}>
                  Avbryt
                </button>
              </div>
            </div>
          )}

          <p className="dempet liten">Klikk på et navn for å endre stavemåten.</p>
          <ul className="elevtabell">
            {[...liste.elever].sort(sorterNavn).map((elev) => (
              <Elevrad
                key={`${elev.id}:${elev.navn}`}
                elev={elev}
                plass={elevensPlassIAktivtKart(data, elev.id)}
                onEndreNavn={(navn) => endre((d) => endreElevnavn(d, liste.id, elev.id, navn))}
                onFjern={() => fjern(elev)}
              />
            ))}
          </ul>
          {liste.elever.length === 0 && <p className="dempet">Lista er tom.</p>}
        </section>
      )}
    </div>
  );
}
