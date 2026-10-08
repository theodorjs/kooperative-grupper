import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import Ikon from './Ikon.jsx';

export const PAPIRSTORRELSER = ['A4', 'A3'];

/**
 * Papirstørrelse for utskrift av en side. Gir @page-regelen siden skal
 * tegne, og en funksjon som skriver ut i valgt størrelse. Etter utskriften
 * går den tilbake til A4, så vanlig Ctrl+P gir A4.
 */
export function useUtskrift(retning) {
  const [papir, setPapir] = useState('A4');

  useEffect(() => {
    const tilbake = () => setPapir('A4');
    window.addEventListener('afterprint', tilbake);
    return () => window.removeEventListener('afterprint', tilbake);
  }, []);

  function skrivUt(valg) {
    // Siden må tegnes med riktig @page før utskriftsvinduet åpnes.
    flushSync(() => setPapir(valg));
    window.print();
  }

  return {
    papir,
    skrivUt,
    papirklasse: `papir-${papir.toLowerCase()}`,
    sidestil: <style>{`@page { size: ${papir} ${retning}; margin: 10mm; }`}</style>,
  };
}

/** «Skriv ut»-knapp som åpner et lite valg mellom A4 og A3. */
export function Utskriftsknapp({ tekst, onSkrivUt, disabled = false }) {
  const [apen, setApen] = useState(false);
  const rot = useRef(null);

  useEffect(() => {
    if (!apen) return undefined;
    const lukkUtenfor = (e) => {
      if (!rot.current?.contains(e.target)) setApen(false);
    };
    const lukkMedEsc = (e) => e.key === 'Escape' && setApen(false);
    document.addEventListener('pointerdown', lukkUtenfor);
    document.addEventListener('keydown', lukkMedEsc);
    return () => {
      document.removeEventListener('pointerdown', lukkUtenfor);
      document.removeEventListener('keydown', lukkMedEsc);
    };
  }, [apen]);

  return (
    <div className="utskriftsvalg" ref={rot}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={apen}
        disabled={disabled}
        onClick={() => setApen((a) => !a)}
      >
        <Ikon navn="skriver" /> {tekst} <span aria-hidden>▾</span>
      </button>
      {apen && (
        <div className="utskriftsmeny" role="menu">
          {PAPIRSTORRELSER.map((papir) => (
            <button
              key={papir}
              type="button"
              role="menuitem"
              onClick={() => {
                setApen(false);
                onSkrivUt(papir);
              }}
            >
              {papir}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
