// Adressen for henvendelser om nettsiden. Så lenge den er tom, vises
// «Kontakt» som vanlig tekst i stedet for en lenke som ikke virker.
export const KONTAKT_EPOST = '';

export const SANDAKERS_VERDEN = 'https://theodorjs.github.io/sandakersverden/';

export default function Bunntekst() {
  return (
    <footer className="bunntekst ikke-utskrift">
      © 2026 Theodor Sandaker · Alle rettigheter forbeholdt ·{' '}
      {KONTAKT_EPOST ? <a href={`mailto:${KONTAKT_EPOST}`}>Kontakt</a> : <span>Kontakt</span>}
      {' · '}en del av <a href={SANDAKERS_VERDEN}>Sandakers Verden</a>
    </footer>
  );
}
