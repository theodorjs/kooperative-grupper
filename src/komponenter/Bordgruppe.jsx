import { gruppenavn } from '../logikk/grupper.js';
import { lagMal } from '../logikk/maler.js';
import { lokalTilRom } from '../logikk/orientering.js';
import { rollerForPlass } from '../logikk/roller.js';
import Pult, { SKALA } from './Pult.jsx';

const KANT = 0.32; // ekstra flate rundt pultene (stoler) som kan brukes til å dra gruppa

export default function Bordgruppe({
  gruppe,
  oppsett,
  rotasjon,
  navn,
  valgt,
  rolleuke,
  rollefarger,
  maal,
  draElevId,
  renummerering,
  onGruppePeker,
  onPultPeker,
  visNavn = true,
}) {
  const mal = lagMal(gruppe.storrelse, oppsett);
  const halvB = mal.bredde / 2 + KANT;
  const halvH = mal.hoyde / 2 + KANT;
  const etikett = lokalTilRom({ x: 0, y: mal.hoyde / 2 + KANT + 0.28 }, gruppe, rotasjon);

  return (
    <g className={`bordgruppe${valgt ? ' valgt' : ''}`} data-gruppe={gruppe.id}>
      <g transform={`translate(${gruppe.x * SKALA} ${gruppe.y * SKALA}) rotate(${rotasjon})`}>
        <rect
          className="gruppeflate"
          x={-halvB * SKALA}
          y={-halvH * SKALA}
          width={2 * halvB * SKALA}
          height={2 * halvH * SKALA}
          rx={18}
          onPointerDown={onGruppePeker}
        />
        {mal.pulter.map((pult, indeks) => {
          const plass = gruppe.plasser[indeks];
          const plassId = `${gruppe.id}:${indeks}`;
          let klikknummer;
          if (renummerering) {
            const pos = renummerering.indexOf(indeks);
            klikknummer = pos === -1 ? null : pos + 1;
          }
          return (
            <Pult
              key={indeks}
              pult={pult}
              plass={plass}
              plassId={plassId}
              navn={plass.elevId ? navn.get(plass.elevId) ?? null : null}
              roller={rolleuke === null ? null : rollerForPlass(plass.nummer, gruppe.storrelse, rolleuke)}
              erMaal={maal === plassId}
              erDratt={Boolean(draElevId) && plass.elevId === draElevId}
              klikknummer={klikknummer}
              rollefarger={rollefarger}
              gruppeRotasjon={rotasjon}
              onPeker={(e) => onPultPeker(e, indeks)}
            />
          );
        })}
      </g>
      {visNavn && (
        <text
          className="gruppenavn"
          x={etikett.x * SKALA}
          y={etikett.y * SKALA}
          dy="0.35em"
          onPointerDown={onGruppePeker}
        >
          {gruppenavn(gruppe)}
        </text>
      )}
    </g>
  );
}
