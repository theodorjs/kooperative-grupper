// Små ikoner tegnet inline, slik at appen ikke henter noe utenfra.

const STIER = {
  laast: 'M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5z',
  aapen: 'M7 10V7a5 5 0 0 1 9.6-2M5 10h14v11H5z',
  venstre: 'M15 5l-7 7 7 7',
  hoyre: 'M9 5l7 7-7 7',
  skriver: 'M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z',
  hank: 'M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01',
};

export default function Ikon({ navn, storrelse = 16, tittel }) {
  return (
    <svg
      className="ikon"
      width={storrelse}
      height={storrelse}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={navn === 'hank' ? 3.2 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={tittel ? undefined : true}
      role={tittel ? 'img' : undefined}
    >
      {tittel && <title>{tittel}</title>}
      <path d={STIER[navn]} />
    </svg>
  );
}
