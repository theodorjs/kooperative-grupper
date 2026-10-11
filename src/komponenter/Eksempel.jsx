import { useMemo } from 'react';
import { aktivElevliste, aktivtKlassekart } from '../data/operasjoner.js';
import { effektivtOppsett } from '../logikk/maler.js';
import { gruppeRotasjon } from '../logikk/orientering.js';
import { ukeforskyvning } from '../logikk/roller.js';
import { rotasjonsroller } from '../logikk/rollebibliotek.js';
import { iDag } from '../logikk/uke.js';
import Bordgruppe from './Bordgruppe.jsx';
import { SKALA } from './Pult.jsx';

const ingenting = () => {};

/** Klassekartet tegnet uten verktøy, til forhåndsvisning. Kan ikke endres. */
function Kartbilde({ data }) {
  const kart = aktivtKlassekart(data);
  const elever = aktivElevliste(data).elever;
  const navn = useMemo(() => new Map(elever.map((e) => [e.id, e.navn])), [elever]);
  const { rom, rotasjonStart, ferier } = data.innstillinger;
  const rolleuke = ukeforskyvning(rotasjonStart, iDag(), ferier);
  const rollefarger = rotasjonsroller(data).map((r) => r.farge);
  const W = rom.bredde * SKALA;
  const L = rom.lengde * SKALA;
  const tavlebredde = Math.min(rom.bredde * 0.45, 4.5) * SKALA;

  return (
    <svg
      className="kart-svg eksempelkart"
      viewBox={`${-45} ${-75} ${W + 90} ${L + 125}`}
      role="img"
      aria-label={`Eksempel på et klassekart med ${elever.length} elever i ${kart.bordgrupper.length} bordgrupper`}
    >
      <rect className="rom" x={0} y={0} width={W} height={L} />
      <rect className="tavle" x={(W - tavlebredde) / 2} y={-7} width={tavlebredde} height={14} rx={3} />
      <text className="tavletekst" x={W / 2} y={-26}>
        Tavla
      </text>
      {kart.bordgrupper.map((g) => (
        <Bordgruppe
          key={g.id}
          gruppe={g}
          oppsett={effektivtOppsett(g, kart)}
          rotasjon={gruppeRotasjon(g, rom)}
          navn={navn}
          rolleuke={rolleuke}
          rollefarger={rollefarger}
          onGruppePeker={ingenting}
          onPultPeker={ingenting}
        />
      ))}
    </svg>
  );
}

/** Smakebit på startsiden: et ferdig klassekart med roller, og en knapp for å prøve selv. */
export default function Eksempel({ data, onUtforsk }) {
  const roller = rotasjonsroller(data);
  const antall = aktivElevliste(data).elever.length;

  return (
    <section className="kort eksempel" aria-labelledby="eksempel-tittel">
      <h2 id="eksempel-tittel">Slik kan klassen din se ut</h2>
      <p className="dempet">
        Et eksempel med {antall} elever. Hver elev får en samarbeidsrolle, og rollene byttes automatisk hver uke.
      </p>
      <Kartbilde data={data} />
      <ul className="rolleforklaring">
        {roller.map((rolle) => (
          <li key={rolle.nummer}>
            <span className="rolleprikk" style={{ background: rolle.farge }}>
              {rolle.nummer}
            </span>
            {rolle.navn}
          </li>
        ))}
      </ul>
      <ul className="fordeler">
        <li>Lag bordgrupper og dra elevene dit de skal sitte.</li>
        <li>Se hvem som har hvilken rolle denne uka.</li>
        <li>Skriv ut klassekart og rolleoversikt på A4 eller A3.</li>
      </ul>
      <button type="button" onClick={onUtforsk}>
        Utforsk eksempelklassen
      </button>
    </section>
  );
}
