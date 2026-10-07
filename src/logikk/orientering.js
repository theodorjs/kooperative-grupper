// Romkoordinater er i meter. Origo er øvre venstre hjørne, tavla står på
// kortveggen øverst (y = 0), og y øker bakover i rommet.

export function tavlaMidtpunkt(rom) {
  return { x: rom.bredde / 2, y: 0 };
}

/**
 * Rotasjon i grader (med klokka, slik SVG roterer) som får gruppens
 * "fremover" til å peke mot midtpunktet på tavleveggen.
 */
export function autoRotasjon(x, y, rom) {
  const tavla = tavlaMidtpunkt(rom);
  const dx = tavla.x - x;
  const dy = tavla.y - y;
  if (dx === 0 && dy === 0) return 0;
  return (Math.atan2(dx, -dy) * 180) / Math.PI;
}

export function gruppeRotasjon(gruppe, rom) {
  return gruppe.rotasjon ?? autoRotasjon(gruppe.x, gruppe.y, rom);
}

/** Roterer et punkt med klokka (SVG-retning) rundt origo. */
export function roter({ x, y }, grader) {
  const v = (grader * Math.PI) / 180;
  const cos = Math.cos(v);
  const sin = Math.sin(v);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}

/** Gjør om et punkt i gruppens egne koordinater til romkoordinater. */
export function lokalTilRom(punkt, gruppe, rotasjon) {
  const r = roter(punkt, rotasjon);
  return { x: gruppe.x + r.x, y: gruppe.y + r.y };
}

/** Retningen en elev ser i (enhetsvektor), gitt pultens samlede rotasjon. */
export function blikkretning(grader) {
  return roter({ x: 0, y: -1 }, grader);
}

/** Normaliserer en vinkel til området (-180, 180]. */
export function normaliserVinkel(grader) {
  let v = grader % 360;
  if (v > 180) v -= 360;
  if (v <= -180) v += 360;
  return v;
}

/** Hvor mange grader forbi loddrett en tekst kan helle før den snus. */
export const SNUMARGIN = 15;

/**
 * Navn på pultene skal leses fra elevens side, men aldri stå opp ned for den
 * som ser på kartet. Heller teksten mer enn 15° forbi loddrett (altså er den
 * rotert mer enn 105° fra vannrett), snus den 180°. Hvilken vei eleven sitter,
 * viser stolen. Margen gjør at navn som står omtrent loddrett, ikke hopper
 * fram og tilbake når gruppa flyttes litt.
 */
export function tekstSkalSnus(grader) {
  return Math.abs(normaliserVinkel(grader)) > 90 + SNUMARGIN;
}
