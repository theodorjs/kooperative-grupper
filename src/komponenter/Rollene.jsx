import { useState } from 'react';
import {
  endreRolle,
  IKONFORSLAG,
  leggTilRolle,
  nesteFarge,
  plassIRotasjonen,
  ROLLEFARGER,
  rotasjonsroller,
  settRotasjonsrolle,
  slettRolle,
  tolkBeskrivelse,
} from '../logikk/rollebibliotek.js';

function Beskrivelse({ tekst }) {
  const blokker = tolkBeskrivelse(tekst);
  if (blokker.length === 0) return <p className="dempet">Ingen beskrivelse.</p>;
  return blokker.map((b, i) => {
    if (b.type === 'liste') {
      return (
        <ul key={i}>
          {b.punkter.map((p, j) => (
            <li key={j}>{p}</li>
          ))}
        </ul>
      );
    }
    if (b.type === 'overskrift') return <h4 key={i}>{b.tekst}</h4>;
    return <p key={i}>{b.tekst}</p>;
  });
}

function Rolleskjema({ rolle, setRolle, onLagre, onAvbryt }) {
  const sett = (felt) => (e) => setRolle({ ...rolle, [felt]: e.target.value });
  const kanLagres = rolle.navn.trim().length > 0;

  return (
    <form
      className="rolleskjema"
      onSubmit={(e) => {
        e.preventDefault();
        if (kanLagres) onLagre(rolle);
      }}
    >
      <div className="rolleskjema-topp">
        <label className="ikonfelt">
          Ikon
          <input type="text" value={rolle.ikon} onChange={sett('ikon')} maxLength={8} aria-label="Ikon (emoji)" />
        </label>
        <label>
          Navn
          <input type="text" value={rolle.navn} onChange={sett('navn')} maxLength={40} required autoFocus />
        </label>
      </div>
      <div className="ikonforslag" role="group" aria-label="Forslag til ikon">
        {IKONFORSLAG.map((ikon) => (
          <button
            key={ikon}
            type="button"
            aria-pressed={rolle.ikon === ikon}
            onClick={() => setRolle({ ...rolle, ikon })}
          >
            {ikon}
          </button>
        ))}
      </div>
      <label>
        Tillegg (valgfritt)
        <input type="text" value={rolle.tillegg} onChange={sett('tillegg')} maxLength={60} placeholder="For eksempel (og ordenselev)" />
      </label>
      <fieldset>
        <legend>Farge</legend>
        <div className="fargevalg-ruter" role="group" aria-label="Farge">
          {ROLLEFARGER.map((farge) => (
            <button
              key={farge}
              type="button"
              className="fargerute"
              style={{ background: farge }}
              aria-pressed={rolle.farge.toUpperCase() === farge}
              aria-label={`Farge ${farge}`}
              onClick={() => setRolle({ ...rolle, farge })}
            />
          ))}
        </div>
      </fieldset>
      <label>
        Beskrivelse
        <textarea rows={8} value={rolle.beskrivelse} onChange={sett('beskrivelse')} maxLength={2000} />
      </label>
      <p className="dempet liten">
        Start en linje med «-» for å lage et punkt. En linje rett før punktene blir en underoverskrift.
      </p>
      <div className="knapperad">
        <button type="submit" className="hoved" disabled={!kanLagres}>
          Lagre
        </button>
        <button type="button" onClick={onAvbryt}>
          Avbryt
        </button>
      </div>
    </form>
  );
}

function Rollekort({ rolle: lagret, plass, redigerer, onRediger, onLagre, onAvbryt, onSlett }) {
  // Under redigering viser kortet utkastet, så endringene synes med en gang.
  const [utkast, setUtkast] = useState(lagret);
  const rolle = redigerer ? utkast : lagret;

  return (
    <article className="rollekort" style={{ '--rollefarge': rolle.farge }}>
      <header className="rollekort-topp">
        <span className="rollekort-kicker">Samarbeidsrolle</span>
        <span className="rollekort-ikon" aria-hidden>
          {rolle.ikon}
        </span>
        <h3>{rolle.navn || 'Ny rolle'}</h3>
        {rolle.tillegg && <span className="rollekort-tillegg">{rolle.tillegg}</span>}
        {plass && <span className="rollekort-plass">Rolle {plass} i Denne uka</span>}
      </header>
      <div className="rollekort-innhold">
        {redigerer ? (
          <Rolleskjema rolle={utkast} setRolle={setUtkast} onLagre={onLagre} onAvbryt={onAvbryt} />
        ) : (
          <>
            <Beskrivelse tekst={rolle.beskrivelse} />
            <div className="knapperad rollekort-knapper">
              <button
                type="button"
                onClick={() => {
                  setUtkast(lagret);
                  onRediger();
                }}
              >
                Rediger
              </button>
              <button
                type="button"
                className="fare"
                onClick={onSlett}
                disabled={plass !== null}
                title={plass ? `Brukes som rolle ${plass}. Bytt den ut under «Roller i rotasjonen» før du sletter den.` : undefined}
              >
                Slett
              </button>
            </div>
          </>
        )}
      </div>
    </article>
  );
}

export default function Rollene({ data, endre }) {
  const [redigerer, setRedigerer] = useState(null); // rolle-id, «ny» eller null
  const iRotasjonen = rotasjonsroller(data);

  function slett(rolle) {
    if (window.confirm(`Vil du slette rollen «${rolle.navn}»? Dette kan ikke angres.`)) {
      endre((d) => slettRolle(d, rolle.id));
    }
  }

  const nyRolle = { id: 'ny', navn: '', tillegg: '', ikon: '⭐', farge: nesteFarge(data.roller), beskrivelse: '' };

  return (
    <div className="rollene">
      <section className="kort">
        <h2>Roller i rotasjonen</h2>
        <p className="dempet liten">
          Disse fire rollene brukes i «Denne uka» og på klassekartet. I grupper med færre enn fire elever slås rolle 2 og 4
          sammen, og i par også rolle 1 og 3. Velger du en rolle som allerede har en plass, bytter de to plass. En rolle
          som står i rotasjonen, må byttes ut her før den kan slettes.
        </p>
        <div className="rotasjonsvalg">
          {iRotasjonen.map((rolle) => (
            <label key={rolle.nummer}>
              <span className="rotasjonsnummer" style={{ background: rolle.farge }}>
                {rolle.nummer}
              </span>
              <select
                value={rolle.id}
                onChange={(e) => endre((d) => settRotasjonsrolle(d, rolle.nummer, e.target.value))}
                aria-label={`Rolle ${rolle.nummer}`}
              >
                {data.roller.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.ikon} {r.navn}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </section>

      <div className="overskriftsrad">
        <h2>Rollebiblioteket</h2>
        <button type="button" className="hoved" onClick={() => setRedigerer('ny')} disabled={redigerer === 'ny'}>
          Ny rolle
        </button>
      </div>

      <div className="rollekort-rutenett">
        {data.roller.map((rolle) => (
          <Rollekort
            key={rolle.id}
            rolle={rolle}
            plass={plassIRotasjonen(data, rolle.id)}
            redigerer={redigerer === rolle.id}
            onRediger={() => setRedigerer(rolle.id)}
            onAvbryt={() => setRedigerer(null)}
            onLagre={(endret) => {
              endre((d) => endreRolle(d, rolle.id, endret));
              setRedigerer(null);
            }}
            onSlett={() => slett(rolle)}
          />
        ))}
        {redigerer === 'ny' && (
          <Rollekort
            rolle={nyRolle}
            plass={null}
            redigerer
            onAvbryt={() => setRedigerer(null)}
            onLagre={(rolle) => {
              endre((d) => leggTilRolle(d, rolle));
              setRedigerer(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
