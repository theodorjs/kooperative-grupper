import { useEffect, useRef, useState } from 'react';
import { harEgetOppsett, klassensOppsett, storrelseForTegning } from '../logikk/grupper.js';
import { oppsettFor, oppsettnavn, STORRELSER_MED_VALG } from '../logikk/maler.js';
import Oppsettegning, { Oppsettvalg } from './Oppsettegning.jsx';

const grupper = (n) => `${n} ${n === 1 ? 'gruppe' : 'grupper'}`;

/** Menyen med layoutene for hver gruppestørrelse. Lukkes med «Ferdig», Esc eller et trykk utenfor. */
function Layoutdialog({ kart, onVelg, onLukk }) {
  const dialog = useRef(null);

  useEffect(() => {
    if (!dialog.current.open) dialog.current.showModal();
  }, []);

  const antall = (s) => kart.bordgrupper.filter((g) => g.storrelse === s).length;
  // Størrelsene som finnes i kartet, kommer først.
  const storrelser = [...STORRELSER_MED_VALG].sort((a, b) => (antall(b) > 0) - (antall(a) > 0));

  return (
    <dialog
      ref={dialog}
      className="oppsettmeny"
      aria-labelledby="oppsettmeny-tittel"
      onClose={onLukk}
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
    >
      <div className="oppsettmeny-innhold">
        <div className="oppsettmeny-topp">
          <h2 id="oppsettmeny-tittel">Layout</h2>
          <button type="button" className="hoved" onClick={() => dialog.current.close()}>
            Ferdig
          </button>
        </div>
        <p className="dempet oppsettmeny-ingress">
          Velg hvordan pultene skal stå. Valget gjelder alle gruppene med like mange plasser i dette klassekartet. Skal
          én gruppe stå annerledes, trykker du på gruppa i kartet.
        </p>

        {storrelser.map((s) => {
          const n = antall(s);
          const egne = kart.bordgrupper.filter((g) => g.storrelse === s && harEgetOppsett(g, kart)).length;
          return (
            <section
              key={s}
              className={n ? 'oppsettseksjon' : 'oppsettseksjon ikke-i-kartet'}
              aria-labelledby={`oppsett-${s}`}
            >
              <div className="oppsettseksjon-topp">
                <h3 id={`oppsett-${s}`} className="oppsettseksjon-tittel">
                  Grupper med {s}
                </h3>
                <span className="dempet liten">{n ? `${grupper(n)} i kartet` : 'Ingen i kartet nå'}</span>
              </div>
              {egne > 0 && (
                <p className="liten oppsettmerknad">
                  {grupper(egne)} har egen layout. Velger du her, får alle gruppene med {s} samme layout.
                </p>
              )}
              <div className="oppsettvalgliste">
                {oppsettFor(s).map((o) => (
                  <Oppsettvalg
                    key={o.id}
                    storrelse={s}
                    oppsett={o.id}
                    valgt={klassensOppsett(kart, s) === o.id}
                    onVelg={() => onVelg(s, o.id)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </dialog>
  );
}

/**
 * Knappen «Layout» i verktøylinja. Tegningen viser klassens valg for
 * firergrupper, eller for 3, 2 eller 5 når kartet ikke har firergrupper.
 */
export default function Oppsettmeny({ kart, onVelg }) {
  const [apen, setApen] = useState(false);
  const storrelse = storrelseForTegning(kart.bordgrupper);
  const valgt = klassensOppsett(kart, storrelse);

  return (
    <>
      <button
        type="button"
        className="layoutknapp"
        aria-label="Layout"
        aria-describedby="layoutknapp-valg"
        aria-haspopup="dialog"
        onClick={() => setApen(true)}
      >
        <Oppsettegning storrelse={storrelse} oppsett={valgt} ramme="tilpass" />
        <span aria-hidden="true">Layout</span>
      </button>
      <span id="layoutknapp-valg" className="skjult">
        Grupper med {storrelse}: {oppsettnavn(storrelse, valgt)}
      </span>
      {apen && <Layoutdialog kart={kart} onVelg={onVelg} onLukk={() => setApen(false)} />}
    </>
  );
}
