import { normaliserVinkel } from '../logikk/orientering.js';

/** Panel for å endre den valgte bordgruppa. */
export default function Gruppedetaljer({
  gruppe,
  rotasjon,
  navn,
  renummerering,
  onStorrelse,
  onLangArm,
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
        <h2>Gruppe {gruppe.nummer}</h2>
        <button type="button" className="lenkeknapp" onClick={onLukk}>
          Lukk
        </button>
      </div>

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

      {gruppe.storrelse === 5 && (
        <fieldset>
          <legend>Lang arm</legend>
          <div className="segment">
            <button type="button" aria-pressed={gruppe.langArm === 'venstre'} onClick={() => onLangArm('venstre')}>
              Venstre
            </button>
            <button type="button" aria-pressed={gruppe.langArm === 'hoyre'} onClick={() => onLangArm('hoyre')}>
              Høyre
            </button>
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend>Retning</legend>
        <label className="avkryssing">
          <input
            type="checkbox"
            checked={automatisk}
            onChange={(e) => onRotasjon(e.target.checked ? null : Math.round(rotasjon))}
          />
          Automatisk mot tavla
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
