import { lagMal, oppsettFor, PULT_KORT, PULT_LANG, STORRELSER_MED_VALG } from '../logikk/maler.js';
import { roter } from '../logikk/orientering.js';
import { SKALA } from './Pult.jsx';

// Liten tegning av en layout, laget fra samme mal som kartet. Tavla er
// streken øverst, stolen viser hvilken side eleven sitter på, og tallene er
// plassnumrene. Målene er i meter og tegnes i centimeter, som kartet.

const STOL = { bredde: 0.44, tykkelse: 0.1, avstand: 0.06 };
const TAVLE = { avstand: 0.32, tykkelse: 0.08, bredde: 1.2 };
const MARG = 0.08;

const hjorner = (x0, y0, x1, y1) => [
  { x: x0, y: y0 },
  { x: x1, y: y0 },
  { x: x0, y: y1 },
  { x: x1, y: y1 },
];
const STOLTOPP = PULT_KORT / 2 + STOL.avstand;
const PUNKTER = [
  ...hjorner(-PULT_LANG / 2, -PULT_KORT / 2, PULT_LANG / 2, PULT_KORT / 2),
  ...hjorner(-STOL.bredde / 2, STOLTOPP, STOL.bredde / 2, STOLTOPP + STOL.tykkelse),
];

/** Halv bredde og høyde for pultene med stoler, regnet fra gruppas midtpunkt. */
function utstrekning(mal) {
  let x = 0;
  let y = 0;
  for (const p of mal.pulter) {
    for (const punkt of PUNKTER) {
      const r = roter(punkt, p.rotasjon);
      x = Math.max(x, Math.abs(p.x + r.x));
      y = Math.max(y, Math.abs(p.y + r.y));
    }
  }
  return { x, y };
}

function felles(storrelser) {
  return storrelser
    .flatMap((s) => oppsettFor(s).map((o) => utstrekning(lagMal(s, o.id))))
    .reduce((a, b) => ({ x: Math.max(a.x, b.x), y: Math.max(a.y, b.y) }), { x: 0, y: 0 });
}

// Tegninger som står sammen, har samme målestokk, så en liten gruppe ser liten ut.
const ALLE = felles(STORRELSER_MED_VALG);

const cm = (meter) => Math.round(meter * SKALA * 10) / 10;

/**
 * ramme: 'alle' (samme målestokk for alle størrelser, som i Layout-menyen),
 * 'storrelse' (samme målestokk for layoutene til én størrelse) eller
 * 'tilpass' (tegningen fyller ruta, som på knappen i verktøylinja).
 */
export default function Oppsettegning({ storrelse, oppsett, visNummer = false, ramme = 'alle' }) {
  const mal = lagMal(storrelse, oppsett);
  let e = ALLE;
  if (ramme === 'tilpass') e = utstrekning(mal);
  else if (ramme === 'storrelse') e = felles([storrelse]);

  const tavleY = -e.y - TAVLE.avstand - TAVLE.tykkelse;
  const tavlebredde = Math.min(TAVLE.bredde, 1.4 * e.x);
  const viewBox = [-e.x - MARG, tavleY - MARG, 2 * (e.x + MARG), e.y - tavleY + 2 * MARG].map(cm).join(' ');

  return (
    <svg className="oppsettegning" viewBox={viewBox} aria-hidden="true" focusable="false">
      <rect
        className="oppsettegning-tavle"
        x={cm(-tavlebredde / 2)}
        y={cm(tavleY)}
        width={cm(tavlebredde)}
        height={cm(TAVLE.tykkelse)}
        rx={cm(TAVLE.tykkelse / 2)}
      />
      {mal.pulter.map((p, i) => (
        <g key={i} transform={`translate(${cm(p.x)} ${cm(p.y)}) rotate(${p.rotasjon})`}>
          <rect
            className="oppsettegning-stol"
            x={cm(-STOL.bredde / 2)}
            y={cm(STOLTOPP)}
            width={cm(STOL.bredde)}
            height={cm(STOL.tykkelse)}
            rx={cm(STOL.tykkelse / 2)}
          />
          <rect
            className="oppsettegning-pult"
            x={cm(-PULT_LANG / 2)}
            y={cm(-PULT_KORT / 2)}
            width={cm(PULT_LANG)}
            height={cm(PULT_KORT)}
            rx={3}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ))}
      {visNummer &&
        mal.pulter.map((p, i) => (
          <text key={i} className="oppsettegning-nummer" x={cm(p.x)} y={cm(p.y)} dy="0.36em">
            {i + 1}
          </text>
        ))}
    </svg>
  );
}

/** Knapp med tegning og navn på én layout. Tegningen forklarer seg selv; beskrivelsen ligger bare i title. */
export function Oppsettvalg({ storrelse, oppsett, valgt, kompakt = false, onVelg }) {
  const { navn, beskrivelse } = oppsettFor(storrelse).find((o) => o.id === oppsett);
  return (
    <button
      type="button"
      className={kompakt ? 'oppsettvalg kompakt' : 'oppsettvalg'}
      aria-pressed={valgt}
      title={beskrivelse}
      onClick={onVelg}
    >
      <Oppsettegning storrelse={storrelse} oppsett={oppsett} visNummer ramme={kompakt ? 'storrelse' : 'alle'} />
      <span className="oppsettvalg-navn">{navn}</span>
    </button>
  );
}
