import { describe, expect, it } from 'vitest';
import { lagMal, PULT_KORT, PULT_LANG, pultHalvmal } from './maler.js';
import { autoRotasjon, blikkretning, lokalTilRom, normaliserVinkel, roter, SNUMARGIN, tavlaMidtpunkt, tekstSkalSnus } from './orientering.js';

const ROM = { bredde: 9, lengde: 10 };
const MALER = [
  [1, 'venstre'],
  [2, 'venstre'],
  [3, 'venstre'],
  [4, 'venstre'],
  [5, 'venstre'],
  [5, 'hoyre'],
];
const erSidelengs = (p) => Math.abs(p.rotasjon) === 90;
const naer = (a, b) => Math.abs(a - b) < 1e-9;

/** Vinkel med klokka sett ovenfra (y peker bakover/nedover på kartet). */
const vinkel = (p, sentrum) => Math.atan2(p.y - sentrum.y, p.x - sentrum.x);

function erMedKlokka(pulter) {
  const sentrum = {
    x: pulter.reduce((s, p) => s + p.x, 0) / pulter.length,
    y: pulter.reduce((s, p) => s + p.y, 0) / pulter.length,
  };
  const start = vinkel(pulter[0], sentrum);
  const relative = pulter.map((p) => {
    let v = vinkel(p, sentrum) - start;
    while (v < 0) v += 2 * Math.PI;
    return v;
  });
  return relative.every((v, i) => i === 0 || v > relative[i - 1]);
}

describe('pultmaler', () => {
  it('har én pult per elev', () => {
    for (const [storrelse, arm] of MALER) expect(lagMal(storrelse, arm).pulter).toHaveLength(storrelse);
  });

  it('er sentrert rundt gruppas midtpunkt', () => {
    for (const [storrelse, arm] of MALER) {
      const { pulter, bredde, hoyde } = lagMal(storrelse, arm);
      const xs = pulter.flatMap((p) => [p.x - pultHalvmal(p.rotasjon).x, p.x + pultHalvmal(p.rotasjon).x]);
      const ys = pulter.flatMap((p) => [p.y - pultHalvmal(p.rotasjon).y, p.y + pultHalvmal(p.rotasjon).y]);
      expect(naer(Math.min(...xs), -bredde / 2)).toBe(true);
      expect(naer(Math.max(...ys), hoyde / 2)).toBe(true);
    }
  });

  it('har pulter som ikke overlapper', () => {
    for (const [storrelse, arm] of MALER) {
      const { pulter } = lagMal(storrelse, arm);
      for (let i = 0; i < pulter.length; i += 1) {
        for (let j = i + 1; j < pulter.length; j += 1) {
          const a = pulter[i];
          const b = pulter[j];
          const ha = pultHalvmal(a.rotasjon);
          const hb = pultHalvmal(b.rotasjon);
          const overlappX = Math.abs(a.x - b.x) < ha.x + hb.x - 1e-9;
          const overlappY = Math.abs(a.y - b.y) < ha.y + hb.y - 1e-9;
          expect(overlappX && overlappY).toBe(false);
        }
      }
    }
  });

  it('har plass 1 som den fremste sidelengs pulten på høyre side', () => {
    for (const [storrelse, arm] of MALER.filter(([s]) => s >= 3)) {
      const { pulter } = lagMal(storrelse, arm);
      const hoyreSidelengs = pulter.filter((p) => erSidelengs(p) && p.x > 0);
      const fremst = Math.min(...hoyreSidelengs.map((p) => p.y));
      expect(erSidelengs(pulter[0])).toBe(true);
      expect(pulter[0].x).toBeGreaterThan(0);
      expect(pulter[0].y).toBe(fremst);
    }
  });

  it('nummererer resten med klokka sett ovenfra', () => {
    for (const [storrelse, arm] of MALER.filter(([s]) => s >= 3)) {
      expect(erMedKlokka(lagMal(storrelse, arm).pulter)).toBe(true);
    }
  });

  it('nummererer 2-grupper med 1 til høyre og 2 til venstre', () => {
    const { pulter } = lagMal(2);
    expect(pulter[0].x).toBeGreaterThan(pulter[1].x);
  });

  it('setter elevene i armene vendt mot hverandre, og de bakerste mot tavla', () => {
    for (const [storrelse, arm] of MALER) {
      for (const p of lagMal(storrelse, arm).pulter) {
        const blikk = blikkretning(p.rotasjon);
        if (erSidelengs(p)) {
          // Eleven ser innover mot gruppas midtlinje
          expect(Math.sign(blikk.x)).toBe(-Math.sign(p.x));
          expect(naer(blikk.y, 0)).toBe(true);
        } else {
          expect(naer(blikk.y, -1)).toBe(true);
        }
      }
    }
  });

  it('gir 4-gruppa en U-form med åpning mellom armene', () => {
    const { pulter } = lagMal(4);
    const [hoyreArm, , , venstreArm] = pulter;
    const aapning = hoyreArm.x - venstreArm.x - PULT_KORT;
    expect(aapning).toBeGreaterThan(0);
    expect(pulter[1].y).toBeGreaterThan(hoyreArm.y);
    expect(pulter[2].y).toBeGreaterThan(venstreArm.y);
  });

  it('forlenger venstre arm i 5-gruppa som standard, og kan bytte til høyre', () => {
    const venstre = lagMal(5, 'venstre').pulter;
    expect(venstre.filter((p) => erSidelengs(p) && p.x < 0)).toHaveLength(2);
    expect(venstre.filter((p) => erSidelengs(p) && p.x > 0)).toHaveLength(1);
    const hoyre = lagMal(5, 'hoyre').pulter;
    expect(hoyre.filter((p) => erSidelengs(p) && p.x > 0)).toHaveLength(2);
    expect(hoyre.filter((p) => erSidelengs(p) && p.x < 0)).toHaveLength(1);
  });

  it('nummererer 5-gruppa med 4 nærmest bakerste rad og 5 fremst på venstre arm', () => {
    const p = lagMal(5, 'venstre').pulter;
    expect(p[3].x).toBeLessThan(0);
    expect(p[4].x).toBeLessThan(0);
    expect(p[4].y).toBeLessThan(p[3].y);
  });

  it('bruker pulter i forholdet 7:5', () => {
    expect(PULT_LANG / PULT_KORT).toBeCloseTo(7 / 5);
  });
});

describe('orientering mot tavla', () => {
  const posisjoner = [
    { x: 4.5, y: 5 },
    { x: 1, y: 2 },
    { x: 8.5, y: 1 },
    { x: 0.5, y: 9.5 },
    { x: 8, y: 9 },
    { x: 3, y: 0.5 },
  ];

  it('peker "fremover" mot midtpunktet på tavleveggen fra alle steder', () => {
    const tavla = tavlaMidtpunkt(ROM);
    for (const pos of posisjoner) {
      const fremover = blikkretning(autoRotasjon(pos.x, pos.y, ROM));
      const lengde = Math.hypot(tavla.x - pos.x, tavla.y - pos.y);
      expect(fremover.x).toBeCloseTo((tavla.x - pos.x) / lengde);
      expect(fremover.y).toBeCloseTo((tavla.y - pos.y) / lengde);
    }
  });

  it('gir rotasjon 0 rett foran tavla og skråstilte grupper ute ved veggene', () => {
    expect(autoRotasjon(4.5, 5, ROM)).toBe(0);
    expect(autoRotasjon(1, 5, ROM)).toBeGreaterThan(0);
    expect(autoRotasjon(8, 5, ROM)).toBeLessThan(0);
  });

  it('gir sidelengs pulter kortsiden fremover, uansett hvor gruppa står', () => {
    for (const pos of posisjoner) {
      const rot = autoRotasjon(pos.x, pos.y, ROM);
      const fremover = blikkretning(rot);
      for (const p of lagMal(4).pulter.filter(erSidelengs)) {
        // Pultens langside går langs pultens egen x-akse
        const langside = roter({ x: 1, y: 0 }, rot + p.rotasjon);
        const kryss = langside.x * fremover.y - langside.y * fremover.x;
        expect(Math.abs(kryss)).toBeLessThan(1e-9);
      }
    }
  });

  it('beholder nummerering med klokka når gruppa roteres og flyttes', () => {
    for (const pos of posisjoner) {
      const rot = autoRotasjon(pos.x, pos.y, ROM);
      for (const [storrelse, arm] of MALER.filter(([s]) => s >= 3)) {
        const iRommet = lagMal(storrelse, arm).pulter.map((p) => lokalTilRom(p, pos, rot));
        expect(erMedKlokka(iRommet)).toBe(true);
      }
    }
  });
});

describe('navn som ikke står opp ned', () => {
  it('snur tekst som heller mer enn 15° forbi loddrett', () => {
    expect(tekstSkalSnus(0)).toBe(false);
    expect(tekstSkalSnus(90)).toBe(false);
    expect(tekstSkalSnus(-90)).toBe(false);
    expect(tekstSkalSnus(-100)).toBe(false);
    expect(tekstSkalSnus(110)).toBe(true);
    expect(tekstSkalSnus(135)).toBe(true);
    expect(tekstSkalSnus(-140)).toBe(true);
    expect(tekstSkalSnus(180)).toBe(true);
    expect(tekstSkalSnus(-270)).toBe(false);
  });

  it('snur navnet på venstre arm i en gruppe oppe til venstre i rommet', () => {
    // Som gruppe 4 i klassekartet fra læreren: armen peker skrått mot tavla.
    const rot = autoRotasjon(2, 3, ROM);
    const venstreArm = lagMal(3).pulter[2];
    expect(tekstSkalSnus(rot + venstreArm.rotasjon)).toBe(true);
    expect(tekstSkalSnus(rot + lagMal(3).pulter[0].rotasjon)).toBe(false);
  });

  it('snur ikke navn i grupper som står nesten midt foran tavla', () => {
    const rot = autoRotasjon(4.6, 8.1, ROM);
    for (const p of lagMal(3).pulter) expect(tekstSkalSnus(rot + p.rotasjon)).toBe(false);
  });

  it('gir aldri navn som står opp ned, uansett hvor gruppa står', () => {
    for (let x = 0.5; x < ROM.bredde; x += 0.5) {
      for (let y = 0.5; y < ROM.lengde; y += 0.5) {
        const rot = autoRotasjon(x, y, ROM);
        for (const [storrelse, arm] of MALER) {
          for (const p of lagMal(storrelse, arm).pulter) {
            const vinkel = rot + p.rotasjon + (tekstSkalSnus(rot + p.rotasjon) ? 180 : 0);
            expect(Math.abs(normaliserVinkel(vinkel))).toBeLessThanOrEqual(90 + SNUMARGIN);
          }
        }
      }
    }
  });
});
