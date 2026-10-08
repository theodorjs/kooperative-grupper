// Fargevalget (lys, mørk eller automatisk) gjelder bare denne nettleseren og
// lagres for seg, utenfor appdataene. Et lite skript i index.html leser det
// samme valget før siden tegnes, så den ikke blinker i feil farge.

export const FARGETEMA_NOKKEL = 'kooperative-grupper-fargetema';
export const FARGETEMAER = ['lys', 'mork', 'auto'];

function standardLager() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Verdien til data-theme på <html>, eller null for automatisk. */
export function temaAttributt(valg) {
  if (valg === 'mork') return 'dark';
  if (valg === 'lys') return 'light';
  return null;
}

export function lesFargetema(lager = standardLager()) {
  try {
    const valg = lager?.getItem(FARGETEMA_NOKKEL);
    return FARGETEMAER.includes(valg) ? valg : 'auto';
  } catch {
    return 'auto';
  }
}

export function lagreFargetema(valg, lager = standardLager()) {
  try {
    lager?.setItem(FARGETEMA_NOKKEL, valg);
  } catch {
    // Uten lagring gjelder valget bare til siden lukkes.
  }
}

export function brukFargetema(valg, rot = globalThis.document?.documentElement) {
  if (!rot) return;
  const attributt = temaAttributt(valg);
  if (attributt) rot.setAttribute('data-theme', attributt);
  else rot.removeAttribute('data-theme');
}
