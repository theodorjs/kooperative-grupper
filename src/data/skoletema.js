// Skolefarger: på en skoles egen nettside bruker appen skolens farger.
// Et lite skript i index.html velger skole etter adressen før siden tegnes,
// og setter data-skole på <html>. Fargene ligger i src/stiler/skoler.css.
// Tabellen i index.html må stemme med SKOLER; det sjekker skoletema.test.js.
//
// En skole gjelder når adressen begynner med et av prefiksene, for eksempel
// torderodskole.no og torderod.github.io. «www.» foran teller ikke.

export const SKOLER = [{ id: 'torderod', navn: 'Torderød skole', prefiks: ['torderod'] }];

// ?skole=ingen i adressen slår skolefargene av.
export const INGEN_SKOLE = 'ingen';

/** Id-en til skolen som adressen begynner med, eller null. «www.» teller ikke. */
export function skoleForVert(vert) {
  const navn = String(vert ?? '').toLowerCase().replace(/^www\./, '');
  return SKOLER.find((s) => s.prefiks.some((p) => navn.startsWith(p)))?.id ?? null;
}

/**
 * Samme valg som skriptet i index.html: adressen bestemmer, men ?skole=<id>
 * forhåndsviser en skole (for eksempel på github.io), og ?skole=ingen slår av.
 */
export function skoleForAdresse(vert, sok = '') {
  const onsket = new URLSearchParams(sok).get('skole');
  if (onsket === INGEN_SKOLE) return null;
  if (SKOLER.some((s) => s.id === onsket)) return onsket;
  return skoleForVert(vert);
}

/** Skolen som styrer fargene nå, eller null. */
export function aktivSkole(rot = globalThis.document?.documentElement) {
  const id = rot?.dataset?.skole;
  return SKOLER.find((s) => s.id === id) ?? null;
}
