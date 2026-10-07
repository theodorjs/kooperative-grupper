import Ikon from './Ikon.jsx';

const sorterNavn = (a, b) => a.navn.localeCompare(b.navn, 'nb');

/**
 * Sidepanel med elevene i klassekartets elevliste. Elever uten plass står
 * øverst. Navn kan dras til en plass, og en plassert elev kan dras hit for å
 * fjernes fra plassen.
 */
export default function Elevpanel({ elever, kart, erMaal, draElevId, onStartDrag, onLas }) {
  const plassering = new Map();
  for (const gruppe of kart.bordgrupper) {
    gruppe.plasser.forEach((plass, indeks) => {
      if (plass.elevId) {
        plassering.set(plass.elevId, { gruppe: gruppe.nummer, plass: plass.nummer, gruppeId: gruppe.id, indeks, last: plass.last });
      }
    });
  }

  const utenPlass = elever.filter((e) => !plassering.has(e.id)).sort(sorterNavn);
  const medPlass = elever
    .filter((e) => plassering.has(e.id))
    .sort((a, b) => {
      const pa = plassering.get(a.id);
      const pb = plassering.get(b.id);
      return pa.gruppe - pb.gruppe || pa.plass - pb.plass;
    });

  const startDrag = (e, elev) => {
    // På berøringsskjerm dras det i håndtaket, så lista fortsatt kan rulles.
    if (e.pointerType === 'touch' && !e.target.closest('.dragehank')) return;
    const p = plassering.get(elev.id);
    onStartDrag(e, elev.id, p ? { gruppeId: p.gruppeId, indeks: p.indeks } : null);
  };

  return (
    <section className={`kort elevpanel${erMaal ? ' maal' : ''}`} data-elevpanel>
      <h2>Elever ({elever.length})</h2>
      <p className="dempet liten">Dra et navn til en plass. Dra mellom to plasser for å bytte. Dra hit for å ta eleven bort fra plassen.</p>

      <h3>Uten plass ({utenPlass.length})</h3>
      {utenPlass.length === 0 && <p className="dempet liten">Alle elever har plass.</p>}
      <ul className="elevliste">
        {utenPlass.map((elev) => (
          <li
            key={elev.id}
            className={`elevlapp utenplass${draElevId === elev.id ? ' dratt' : ''}`}
            onPointerDown={(e) => startDrag(e, elev)}
          >
            <span className="dragehank"><Ikon navn="hank" storrelse={14} /></span>
            <span className="navn">{elev.navn}</span>
          </li>
        ))}
      </ul>

      <h3>Har plass ({medPlass.length})</h3>
      <ul className="elevliste">
        {medPlass.map((elev) => {
          const p = plassering.get(elev.id);
          return (
            <li
              key={elev.id}
              className={`elevlapp${draElevId === elev.id ? ' dratt' : ''}`}
              onPointerDown={(e) => startDrag(e, elev)}
            >
              <span className="dragehank"><Ikon navn="hank" storrelse={14} /></span>
              <span className="navn">{elev.navn}</span>
              <span className="plassinfo">
                Gr. {p.gruppe} · pl. {p.plass}
              </span>
              <button
                type="button"
                className={`lasknapp${p.last ? ' last' : ''}`}
                aria-pressed={p.last}
                title={p.last ? 'Låst: blir sittende ved tilfeldig fordeling. Klikk for å låse opp.' : 'Lås eleven på plassen'}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onLas({ gruppeId: p.gruppeId, indeks: p.indeks }, !p.last)}
              >
                <Ikon navn={p.last ? 'laast' : 'aapen'} storrelse={15} tittel={p.last ? 'Låst' : 'Ikke låst'} />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
