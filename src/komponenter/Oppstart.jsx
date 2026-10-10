import { useState } from 'react';
import { opprettElevliste, tolkNavneliste } from '../data/operasjoner.js';
import { ImportKnapp } from './Datafil.jsx';
import Info from './Info.jsx';

export default function Oppstart({ data, endre, onFerdig, onImportert }) {
  const [listenavn, setListenavn] = useState('');
  const [tekst, setTekst] = useState('');
  const navn = tolkNavneliste(tekst);

  function opprett(e) {
    e.preventDefault();
    if (navn.length === 0) return;
    endre((d) => opprettElevliste(d, listenavn || 'Min klasse', navn));
    onFerdig();
  }

  return (
    <section className="kort oppstart">
      <h2>Kom i gang</h2>
      <p>
        Skriv inn eller lim inn elevlisten med ett navn per linje. Appen lager et klassekart med bordgrupper, og du kan
        fordele elevene og se hvem som har hvilken rolle hver uke.
      </p>
      <p className="personvern">
        Navnene lagres bare i denne nettleseren. Ingenting sendes over nettet. Har du fått en klasse fra en kollega,
        eller har du en backup, legger du den inn med «Importer fra fil».
      </p>

      <form onSubmit={opprett} className="skjema">
        <label>
          Navn på elevlisten
          <input
            type="text"
            value={listenavn}
            onChange={(e) => setListenavn(e.target.value)}
            placeholder="For eksempel 7A"
          />
        </label>
        <label>
          Elever (ett navn per linje)
          <textarea rows={14} value={tekst} onChange={(e) => setTekst(e.target.value)} spellCheck={false} />
        </label>
        <div className="knapperad">
          <button type="submit" className="hoved" disabled={navn.length === 0}>
            Lag elevliste{navn.length > 0 ? ` med ${navn.length} ${navn.length === 1 ? 'elev' : 'elever'}` : ''}
          </button>
          <span className="dempet">eller</span>
          <ImportKnapp data={data} endre={endre} onImportert={onImportert} />
        </div>
        <Info felt>
          Du kan kun importere filer laget av denne nettsiden. Det kan være din egen backup eller en fil fra en
          kollega.
        </Info>
      </form>
    </section>
  );
}
