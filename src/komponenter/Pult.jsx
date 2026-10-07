import { PULT_LANG } from '../logikk/maler.js';
import { tekstSkalSnus } from '../logikk/orientering.js';
import { ROLLER } from '../logikk/roller.js';

/** Modellen regner i meter, kartet tegnes i centimeter. */
export const SKALA = 100;

// Innholdet i pulten tegnes for en pult på 70 × 50 og skaleres til modellens størrelse.
const B = 70;
const H = 50;
const SKALERING = (PULT_LANG * SKALA) / B;
const TEKSTBREDDE = B - 8;
const TEGNBREDDE = 0.56; // omtrentlig bredde per tegn, i forhold til skriftstørrelsen

function tilpassNavn(navn) {
  const enLinje = Math.min(14, TEKSTBREDDE / (navn.length * TEGNBREDDE));
  const ord = navn.split(' ');
  if (enLinje >= 10 || ord.length < 2) return { linjer: [navn], storrelse: Math.max(6, enLinje) };
  // Del der de to linjene blir mest like lange.
  let linjer = null;
  for (let i = 1; i < ord.length; i += 1) {
    const forslag = [ord.slice(0, i).join(' '), ord.slice(i).join(' ')];
    if (!linjer || Math.max(...forslag.map((l) => l.length)) < Math.max(...linjer.map((l) => l.length))) {
      linjer = forslag;
    }
  }
  const lengst = Math.max(...linjer.map((l) => l.length));
  return { linjer, storrelse: Math.max(6, Math.min(12.5, TEKSTBREDDE / (lengst * TEGNBREDDE))) };
}

function Hengelaas({ x, y }) {
  return (
    <g className="hengelaas" transform={`translate(${x} ${y})`}>
      <path d="M-3 -1.5v-2.5a3 3 0 0 1 6 0v2.5" fill="none" />
      <rect x={-4.5} y={-1.5} width={9} height={7} rx={1.2} />
    </g>
  );
}

/**
 * Én pult. Tegnes i pultens egne koordinater: eleven sitter på positiv y-side
 * og ser mot negativ y. Navnet står riktig vei sett fra eleven, unntatt når
 * det da ville stått opp ned på kartet (se tekstSkalSnus). Stolen viser
 * uansett hvilken vei eleven sitter.
 */
export default function Pult({
  pult,
  plass,
  plassId,
  navn,
  roller,
  erMaal,
  erDratt,
  klikknummer,
  gruppeRotasjon = 0,
  onPeker,
}) {
  const klasser = ['pult'];
  if (erMaal) klasser.push('maal');
  if (erDratt) klasser.push('dratt');
  if (!navn) klasser.push('tom');
  if (klikknummer !== undefined) klasser.push('renummerer');

  const tekst = navn ? tilpassNavn(navn) : null;
  const linjehoyde = tekst ? tekst.storrelse * 1.1 : 0;
  const tekstY = tekst ? 7 - ((tekst.linjer.length - 1) * linjehoyde) / 2 : 0;

  // Tekst som ellers ville stått opp ned på kartet, snus rundt sitt eget midtpunkt.
  const snu = tekstSkalSnus(gruppeRotasjon + pult.rotasjon);
  const snuRundt = (x, y) => (snu ? `rotate(180 ${x} ${y})` : undefined);

  return (
    <g
      className={klasser.join(' ')}
      transform={`translate(${pult.x * SKALA} ${pult.y * SKALA}) rotate(${pult.rotasjon}) scale(${SKALERING})`}
      data-plass={plassId}
      onPointerDown={onPeker}
    >
      <rect className="stol" x={-17} y={H / 2 + 5} width={34} height={11} rx={5} />
      <rect className="pultflate" x={-B / 2} y={-H / 2} width={B} height={H} rx={2.5} />

      <g className="plassnummer">
        <circle cx={-B / 2 + 9.5} cy={-H / 2 + 9.5} r={7} />
        <text x={-B / 2 + 9.5} y={-H / 2 + 9.5} dy="0.36em" transform={snuRundt(-B / 2 + 9.5, -H / 2 + 9.5)}>
          {plass.nummer}
        </text>
      </g>

      {roller?.map((rolle, i) => (
        <g key={rolle} className="rollemerke">
          <circle cx={B / 2 - 8.5 - i * 12} cy={-H / 2 + 8.5} r={5.6} fill={ROLLER[rolle].farge} />
          <text
            x={B / 2 - 8.5 - i * 12}
            y={-H / 2 + 8.5}
            dy="0.36em"
            transform={snuRundt(B / 2 - 8.5 - i * 12, -H / 2 + 8.5)}
          >
            {rolle}
          </text>
        </g>
      ))}

      {plass.last && (
        <g transform={snuRundt(-B / 2 + 24, -H / 2 + 10)}>
          <Hengelaas x={-B / 2 + 24} y={-H / 2 + 9} />
        </g>
      )}

      {tekst && (
        <text className="elevnavn" x={0} y={tekstY} fontSize={tekst.storrelse} transform={snuRundt(0, 7)}>
          {tekst.linjer.map((linje, i) => (
            <tspan key={i} x={0} dy={i === 0 ? '0.35em' : linjehoyde}>
              {linje}
            </tspan>
          ))}
        </text>
      )}

      {klikknummer !== undefined && (
        <g className="klikknummer">
          <circle cx={0} cy={4} r={13} />
          <text x={0} y={4} dy="0.36em" transform={snuRundt(0, 4)}>
            {klikknummer ?? '?'}
          </text>
        </g>
      )}
    </g>
  );
}
