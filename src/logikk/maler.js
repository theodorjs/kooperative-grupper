// Pultmaler for bordgrupper med 1 til 5 elever.
//
// Koordinater er i meter i gruppens eget system:
//   - "fremover" (mot tavla) er negativ y
//   - "høyre" er positiv x, sett fra en som sitter bakerst og ser mot tavla
//
// Hver pult har et midtpunkt (x, y) og en rotasjon i grader. Rotasjon 0 betyr
// at eleven sitter på baksiden (positiv y) og ser fremover. Rotasjon -90 betyr
// at eleven sitter på høyre side og ser mot venstre, 90 motsatt.
//
// Rekkefølgen i lista er standard plassnummerering: indeks 0 er plass 1.
// Plass 1 er alltid den fremste sidelengs pulten på høyre side, og resten
// nummereres med klokka sett ovenfra med tavla foran.

export const PULT_LANG = 0.7;
export const PULT_KORT = 0.5;

const L = PULT_LANG;
const K = PULT_KORT;
const ARM_X = L - K / 2;

const VENDT_FREM = 0;
const VENDT_MOT_VENSTRE = -90; // eleven sitter til høyre og ser innover
const VENDT_MOT_HOYRE = 90; // eleven sitter til venstre og ser innover

function rapulter(storrelse, langArm) {
  switch (storrelse) {
    case 1:
      return [{ x: 0, y: 0, rotasjon: VENDT_FREM }];
    case 2:
      return [
        { x: L / 2, y: 0, rotasjon: VENDT_FREM }, // 1 høyre
        { x: -L / 2, y: 0, rotasjon: VENDT_FREM }, // 2 venstre
      ];
    case 3:
      return [
        { x: K / 2, y: -L / 2, rotasjon: VENDT_MOT_VENSTRE }, // 1 sidelengs høyre
        { x: 0, y: K / 2, rotasjon: VENDT_FREM }, // 2 bakerst
        { x: -K / 2, y: -L / 2, rotasjon: VENDT_MOT_HOYRE }, // 3 sidelengs venstre
      ];
    case 4:
      return [
        { x: ARM_X, y: -L / 2, rotasjon: VENDT_MOT_VENSTRE }, // 1 høyre arm
        { x: L / 2, y: K / 2, rotasjon: VENDT_FREM }, // 2 bakerst til høyre
        { x: -L / 2, y: K / 2, rotasjon: VENDT_FREM }, // 3 bakerst til venstre
        { x: -ARM_X, y: -L / 2, rotasjon: VENDT_MOT_HOYRE }, // 4 venstre arm
      ];
    case 5:
      if (langArm === 'hoyre') {
        return [
          { x: ARM_X, y: (-3 * L) / 2, rotasjon: VENDT_MOT_VENSTRE }, // 1 høyre arm fremst
          { x: ARM_X, y: -L / 2, rotasjon: VENDT_MOT_VENSTRE }, // 2 høyre arm nærmest bakerste rad
          { x: L / 2, y: K / 2, rotasjon: VENDT_FREM }, // 3 bakerst til høyre
          { x: -L / 2, y: K / 2, rotasjon: VENDT_FREM }, // 4 bakerst til venstre
          { x: -ARM_X, y: -L / 2, rotasjon: VENDT_MOT_HOYRE }, // 5 venstre arm
        ];
      }
      return [
        { x: ARM_X, y: -L / 2, rotasjon: VENDT_MOT_VENSTRE }, // 1 høyre arm
        { x: L / 2, y: K / 2, rotasjon: VENDT_FREM }, // 2 bakerst til høyre
        { x: -L / 2, y: K / 2, rotasjon: VENDT_FREM }, // 3 bakerst til venstre
        { x: -ARM_X, y: -L / 2, rotasjon: VENDT_MOT_HOYRE }, // 4 venstre arm nærmest bakerste rad
        { x: -ARM_X, y: (-3 * L) / 2, rotasjon: VENDT_MOT_HOYRE }, // 5 venstre arm fremst
      ];
    default:
      throw new Error(`Ugyldig gruppestørrelse: ${storrelse}`);
  }
}

/** Halve utstrekninger for en pult langs gruppens x- og y-akse. */
export function pultHalvmal(rotasjon) {
  const sidelengs = Math.abs(rotasjon) % 180 === 90;
  return sidelengs ? { x: K / 2, y: L / 2 } : { x: L / 2, y: K / 2 };
}

/**
 * Mal for en bordgruppe, sentrert slik at midtpunktet av pultene er (0, 0).
 * Returnerer pultene i standard nummerrekkefølge og gruppens bredde/høyde.
 */
export function lagMal(storrelse, langArm = 'venstre') {
  const pulter = rapulter(storrelse, langArm);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of pulter) {
    const h = pultHalvmal(p.rotasjon);
    minX = Math.min(minX, p.x - h.x);
    maxX = Math.max(maxX, p.x + h.x);
    minY = Math.min(minY, p.y - h.y);
    maxY = Math.max(maxY, p.y + h.y);
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const rund = (n) => Math.round(n * 1e6) / 1e6;
  return {
    pulter: pulter.map((p) => ({ x: rund(p.x - cx), y: rund(p.y - cy), rotasjon: p.rotasjon })),
    bredde: rund(maxX - minX),
    hoyde: rund(maxY - minY),
  };
}
