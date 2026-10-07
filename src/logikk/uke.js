// Datoer håndteres som ISO-strenger ("2026-10-05") og regnes om til
// dagnummer i UTC, slik at sommertid og tidssoner aldri forskyver en dag.

const DAG_MS = 24 * 60 * 60 * 1000;

export const MANEDER = [
  'januar', 'februar', 'mars', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'desember',
];

const tosifret = (n) => String(n).padStart(2, '0');

export function tilDagnummer(iso) {
  const [aar, maned, dag] = iso.split('-').map(Number);
  return Math.round(Date.UTC(aar, maned - 1, dag) / DAG_MS);
}

export function fraDagnummer(dagnummer) {
  const d = new Date(dagnummer * DAG_MS);
  return `${d.getUTCFullYear()}-${tosifret(d.getUTCMonth() + 1)}-${tosifret(d.getUTCDate())}`;
}

/** Dagens dato i brukerens lokale tid, som ISO-streng. */
export function iDag(naa = new Date()) {
  return `${naa.getFullYear()}-${tosifret(naa.getMonth() + 1)}-${tosifret(naa.getDate())}`;
}

export function erGyldigDato(iso) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  return fraDagnummer(tilDagnummer(iso)) === iso;
}

export function leggTilDager(iso, dager) {
  return fraDagnummer(tilDagnummer(iso) + dager);
}

/** 0 = mandag, 6 = søndag. */
export function ukedag(iso) {
  return (new Date(tilDagnummer(iso) * DAG_MS).getUTCDay() + 6) % 7;
}

export function mandagForDato(iso) {
  return leggTilDager(iso, -ukedag(iso));
}

/** Ukenummer etter ISO 8601: uka tilhører året torsdagen ligger i. */
export function isoUke(iso) {
  const torsdag = tilDagnummer(mandagForDato(iso)) + 3;
  const aar = new Date(torsdag * DAG_MS).getUTCFullYear();
  const nyttaar = tilDagnummer(`${aar}-01-01`);
  return { uke: Math.floor((torsdag - nyttaar) / 7) + 1, aar };
}

export function formaterDato(iso, medAar = false) {
  const [aar, maned, dag] = iso.split('-').map(Number);
  return `${dag}. ${MANEDER[maned - 1]}${medAar ? ` ${aar}` : ''}`;
}

/** "5. til 11. oktober" eller "28. september til 4. oktober". */
export function formaterUkeperiode(mandag) {
  const sondag = leggTilDager(mandag, 6);
  const [, m1, d1] = mandag.split('-').map(Number);
  const [, m2, d2] = sondag.split('-').map(Number);
  if (m1 === m2) return `${d1}. til ${d2}. ${MANEDER[m2 - 1]}`;
  return `${formaterDato(mandag)} til ${formaterDato(sondag)}`;
}

/** "Uke 41 (5. til 11. oktober)". */
export function ukeoverskrift(dato) {
  const mandag = mandagForDato(dato);
  return `Uke ${isoUke(mandag).uke} (${formaterUkeperiode(mandag)})`;
}
