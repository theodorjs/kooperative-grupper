import { useState } from 'react';
import { gruppenavn } from '../logikk/grupper.js';
import { oppsettFor } from '../logikk/maler.js';
import { normaliserVinkel } from '../logikk/orientering.js';
import Info from './Info.jsx';
import { Oppsettvalg } from './Oppsettegning.jsx';

function Navnefelt({ gruppe, onNavn }) {
  const [utkast, setUtkast] = useState(gruppe.navn ?? '');
  const lagre = () => {
    const rent = utkast.replace(/\s+/g, ' ').trim();
    if (rent !== (gruppe.navn ?? '')) onNavn(rent);
    setUtkast(rent);
  };
  return (
    <input
      type="text"
      value={utkast}
      maxLength={40}
      placeholder={`Gruppe ${gruppe.nummer}`}
      onChange={(e) => setUtkast(e.target.value)}
      onBlur={lagre}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  );
}

/** Panel for å endre den valgte bordgruppa. */
export default function Gruppedetaljer({
  gruppe,
  antallGrupper,
  oppsett,
  egetOppsett,
  navn,
  renummerering,
  onNummer,
  onNavn,
  onStorrelse,
  onOppsett,
  onRotasjon,
  onLas,
  onStartRenummerering,
  onAvbrytRenummerering,
  onStandardNummerering,
  onFjern,
  onLukk,
}) {
  const automatisk = gruppe.rotasjon === null;
  const plasser = gruppe.plasser
    .map((plass, indeks) => ({ ...plass, indeks }))
    .sort((a, b) => a.nummer - b.nummer);
  const harEgenNummerering = gruppe.plasser.some((p, i) => p.nummer !== i + 1);

  return (
    <section className="kort gruppedetaljer">
      <div className="overskriftsrad">
        <h2>{gruppenavn(gruppe)}</h2>
        <button type="button" className="lenkeknapp" onClick={onLukk}>
          Lukk
        </button>
      </div>

      <fieldset>
        <legend>Nummer og navn</legend>
        <div className="gruppenavnfelt">
          <label>
            Nummer
            <select value={gruppe.nummer} onChange={(e) => onNummer(Number(e.target.value))}>
              {Array.from({ length: antallGrupper }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label>
            Navn (valgfritt)
            <Navnefelt key={`${gruppe.id}:${gruppe.navn}`} gruppe={gruppe} onNavn={onNavn} />
          </label>
        </div>
        <Info className="dempet liten">
          Nummeret bestemmer rekkefølgen i rolleoversikten. Velger du et nummer en annen gruppe har, bytter de to
          nummer. Et navn vises i stedet for «Gruppe {gruppe.nummer}».
        </Info>
      </fieldset>

      <fieldset>
        <legend>Antall plasser</legend>
        <div className="segment">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" aria-pressed={gruppe.storrelse === n} onClick={() => onStorrelse(n)}>
              {n}
            </button>
          ))}
        </div>
      </fieldset>

      {gruppe.storrelse > 1 && (
        <fieldset>
          <legend>Layout</legend>
          <div className="oppsettvalgliste kompakt">
            {oppsettFor(gruppe.storrelse).map((o) => (
              <Oppsettvalg
                key={o.id}
                kompakt
                storrelse={gruppe.storrelse}
                oppsett={o.id}
                valgt={oppsett === o.id}
                onVelg={() => onOppsett(o.id)}
              />
            ))}
          </div>
          {egetOppsett ? (
            <p className="dempet liten oppsettstatus">
              Denne gruppa har egen layout.{' '}
              <button type="button" className="lenkeknapp" onClick={() => onOppsett(null)}>
                Som resten av klassen
              </button>
            </p>
          ) : (
            <Info className="dempet liten oppsettstatus">
              Samme som resten av klassen. Knappen «Layout» øverst endrer alle gruppene med {gruppe.storrelse}.
            </Info>
          )}
        </fieldset>
      )}

      <fieldset>
        <legend>Retning</legend>
        <label className="avkryssing">
          <input type="checkbox" checked={automatisk} onChange={(e) => onRotasjon(e.target.checked ? null : 0)} />
          Automatisk orientering
        </label>
        {!automatisk && (
          <div className="rotasjon">
            <button type="button" onClick={() => onRotasjon(normaliserVinkel(gruppe.rotasjon - 15))} aria-label="Roter 15 grader mot klokka">
              −15°
            </button>
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={Math.round(gruppe.rotasjon)}
              onChange={(e) => onRotasjon(Number(e.target.value))}
              aria-label="Rotasjon i grader"
            />
            <button type="button" onClick={() => onRotasjon(normaliserVinkel(gruppe.rotasjon + 15))} aria-label="Roter 15 grader med klokka">
              +15°
            </button>
            <span className="dempet">{Math.round(gruppe.rotasjon)}°</span>
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend>Plasser</legend>
        <Info className="dempet liten">
          <strong>Låst:</strong> eleven blir sittende på plassen når du trykker «Tilfeldig fordeling», mens de andre
          elevene får nye plasser. Du kan fortsatt flytte eleven selv ved å dra.
        </Info>
        <ul className="plassliste">
          {plasser.map((p) => (
            <li key={p.indeks}>
              <span className="plassnr">{p.nummer}</span>
              <span className={p.elevId ? '' : 'dempet'}>{p.elevId ? navn.get(p.elevId) ?? 'Ukjent elev' : 'Tom plass'}</span>
              {p.elevId && (
                <label className="avkryssing liten">
                  <input
                    type="checkbox"
                    checked={p.last}
                    onChange={(e) => onLas({ gruppeId: gruppe.id, indeks: p.indeks }, e.target.checked)}
                  />
                  Låst
                </label>
              )}
            </li>
          ))}
        </ul>

        {renummerering ? (
          <div className="instruks">
            <p>
              Klikk på pultene i den rekkefølgen de skal ha ({renummerering.length} av {gruppe.storrelse}).
            </p>
            <button type="button" onClick={onAvbrytRenummerering}>
              Avbryt
            </button>
          </div>
        ) : (
          <div className="knapperad">
            <button type="button" onClick={onStartRenummerering} disabled={gruppe.storrelse < 2}>
              Endre nummerering
            </button>
            {harEgenNummerering && (
              <button type="button" onClick={onStandardNummerering}>
                Standard nummerering
              </button>
            )}
          </div>
        )}
      </fieldset>

      <button type="button" className="fare" onClick={onFjern}>
        Fjern bordgruppe
      </button>
    </section>
  );
}
