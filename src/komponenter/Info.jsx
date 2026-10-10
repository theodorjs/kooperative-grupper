import Ikon from './Ikon.jsx';

/** Forklarende tekst med et lite informasjonsmerke foran. felt gir en ramme rundt. */
export default function Info({ children, felt = false, className = '', id }) {
  return (
    <p id={id} className={`info${felt ? ' info-felt' : ''} ${className}`.trim()}>
      <Ikon navn="info" storrelse={felt ? 18 : 15} />
      <span>{children}</span>
    </p>
  );
}
