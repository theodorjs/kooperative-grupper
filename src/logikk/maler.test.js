import { describe, expect, it } from 'vitest';
import {
  effektivtOppsett,
  gyldigOppsett,
  lagMal,
  oppsettFor,
  PULT_KORT,
  PULT_LANG,
  pultHalvmal,
  standardKlasseoppsett,
  standardOppsett,
} from './maler.js';
import { autoRotasjon, blikkretning, lokalTilRom, normaliserVinkel, roter, SNUMARGIN, tavlaMidtpunkt, tekstSkalSnus } from './orientering.js';

const ROM = { bredde: 9, lengde: 10 };
// Alle layoutene for alle gruppestørrelser: [størrelse, layout]
const MALER = [1, 2, 3, 4, 5].flatMap((s) => oppsettFor(s).map((o) => [s, o.id]));
const erSidelengs = (p) => Math.abs(p.rotasjon) === 90;
// Pulter på én rekke (samme y) har ikke noe midtpunkt å gå med klokka rundt.
const paRekke = (pulter) => pulter.every((p) => naer(p.y, pulter[0].y));
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

// Fasit: slik lagMal tegnet gruppene før det ble mulig å velge layout.
// Standardlayoutene skal gi nøyaktig de samme tallene, så kart som finnes
// fra før, ser helt like ut.
const DAGENS_MALER = {
  '1': { pulter: [{ x: 0, y: 0, rotasjon: 0 }], bredde: 0.84, hoyde: 0.6 },
  '2': {
    pulter: [{ x: 0.42, y: 0, rotasjon: 0 }, { x: -0.42, y: 0, rotasjon: 0 }],
    bredde: 1.68,
    hoyde: 0.6,
  },
  '3': {
    pulter: [{ x: 0.3, y: -0.3, rotasjon: -90 }, { x: 0, y: 0.42, rotasjon: 0 }, { x: -0.3, y: -0.3, rotasjon: 90 }],
    bredde: 1.2,
    hoyde: 1.44,
  },
  '4': {
    pulter: [
      { x: 0.54, y: -0.3, rotasjon: -90 },
      { x: 0.42, y: 0.42, rotasjon: 0 },
      { x: -0.42, y: 0.42, rotasjon: 0 },
      { x: -0.54, y: -0.3, rotasjon: 90 },
    ],
    bredde: 1.68,
    hoyde: 1.44,
  },
  '5-venstre': {
    pulter: [
      { x: 0.54, y: 0.12, rotasjon: -90 },
      { x: 0.42, y: 0.84, rotasjon: 0 },
      { x: -0.42, y: 0.84, rotasjon: 0 },
      { x: -0.54, y: 0.12, rotasjon: 90 },
      { x: -0.54, y: -0.72, rotasjon: 90 },
    ],
    bredde: 1.68,
    hoyde: 2.28,
  },
  '5-hoyre': {
    pulter: [
      { x: 0.54, y: -0.72, rotasjon: -90 },
      { x: 0.54, y: 0.12, rotasjon: -90 },
      { x: 0.42, y: 0.84, rotasjon: 0 },
      { x: -0.42, y: 0.84, rotasjon: 0 },
      { x: -0.54, y: 0.12, rotasjon: 90 },
    ],
    bredde: 1.68,
    hoyde: 2.28,
  },
};

describe('dagens maler', () => {
  it('tegnes nøyaktig som før med standardlayoutene', () => {
    expect(lagMal(1)).toEqual(DAGENS_MALER['1']);
    expect(lagMal(2)).toEqual(DAGENS_MALER['2']);
    expect(lagMal(3)).toEqual(DAGENS_MALER['3']);
    expect(lagMal(4)).toEqual(DAGENS_MALER['4']);
    expect(lagMal(5)).toEqual(DAGENS_MALER['5-venstre']);
    for (const s of [1, 2, 3, 4]) expect(lagMal(s, standardOppsett(s))).toEqual(DAGENS_MALER[String(s)]);
    expect(lagMal(5, 'lang-venstre')).toEqual(DAGENS_MALER['5-venstre']);
    expect(lagMal(5, 'lang-hoyre')).toEqual(DAGENS_MALER['5-hoyre']);
  });

  it('har dagens utseende som standard for hver størrelse', () => {
    expect([1, 2, 3, 4, 5].map(standardOppsett)).toEqual(['enkel', 'rekke', 'tett', 'apen', 'lang-venstre']);
  });
});

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
    for (const [storrelse, arm] of MALER) {
      const { pulter } = lagMal(storrelse, arm);
      const hoyreSidelengs = pulter.filter((p) => erSidelengs(p) && p.x > 0);
      if (hoyreSidelengs.length === 0) continue; // pulter på rekke, se neste test
      const fremst = Math.min(...hoyreSidelengs.map((p) => p.y));
      expect(erSidelengs(pulter[0])).toBe(true);
      expect(pulter[0].x).toBeGreaterThan(0);
      expect(pulter[0].y).toBe(fremst);
    }
  });

  it('har plass 1 lengst til høyre når ingen pulter står sidelengs', () => {
    const utenSidelengs = MALER.filter(([s, o]) => s >= 2 && !lagMal(s, o).pulter.some(erSidelengs));
    expect(utenSidelengs).toEqual([[2, 'rekke'], [3, 'rekke']]);
    for (const [storrelse, oppsett] of utenSidelengs) {
      const { pulter } = lagMal(storrelse, oppsett);
      expect(pulter[0].x).toBe(Math.max(...pulter.map((p) => p.x)));
    }
  });

  it('nummererer resten med klokka sett ovenfra', () => {
    for (const [storrelse, arm] of MALER.filter(([s]) => s >= 3)) {
      const { pulter } = lagMal(storrelse, arm);
      if (paRekke(pulter)) continue;
      expect(erMedKlokka(pulter)).toBe(true);
    }
  });

  it('nummererer pulter på rekke fra høyre mot venstre', () => {
    const rekker = MALER.filter(([s, o]) => s >= 2 && paRekke(lagMal(s, o).pulter));
    expect(rekker).toEqual([[2, 'rekke'], [2, 'mot'], [3, 'rekke']]);
    for (const [storrelse, oppsett] of rekker) {
      const xer = lagMal(storrelse, oppsett).pulter.map((p) => p.x);
      expect(xer.every((x, i) => i === 0 || x < xer[i - 1])).toBe(true);
    }
  });

  it('nummererer 2-grupper med 1 til høyre og 2 til venstre', () => {
    for (const { id } of oppsettFor(2)) {
      const { pulter } = lagMal(2, id);
      expect(pulter[0].x).toBeGreaterThan(pulter[1].x);
    }
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
    const venstre = lagMal(5).pulter;
    expect(venstre.filter((p) => erSidelengs(p) && p.x < 0)).toHaveLength(2);
    expect(venstre.filter((p) => erSidelengs(p) && p.x > 0)).toHaveLength(1);
    const hoyre = lagMal(5, 'lang-hoyre').pulter;
    expect(hoyre.filter((p) => erSidelengs(p) && p.x > 0)).toHaveLength(2);
    expect(hoyre.filter((p) => erSidelengs(p) && p.x < 0)).toHaveLength(1);
  });

  it('nummererer 5-gruppa med 4 nærmest bakerste rad og 5 fremst på venstre arm', () => {
    const p = lagMal(5, 'lang-venstre').pulter;
    expect(p[3].x).toBeLessThan(0);
    expect(p[4].x).toBeLessThan(0);
    expect(p[4].y).toBeLessThan(p[3].y);
  });

  it('har armer inntil hverandre uten åpning, og samme fotavtrykk som med åpning', () => {
    for (const s of [3, 4]) {
      const armer = lagMal(s, 'tett').pulter.filter(erSidelengs);
      expect(naer(armer[0].x - armer.at(-1).x, PULT_KORT)).toBe(true);
    }
    expect(lagMal(4, 'tett').bredde).toBe(lagMal(4, 'apen').bredde);
    expect(lagMal(4, 'tett').hoyde).toBe(lagMal(4, 'apen').hoyde);
  });

  it('setter tre pulter på rekke som er 2,52 m brede', () => {
    const { pulter, bredde, hoyde } = lagMal(3, 'rekke');
    expect(bredde).toBeCloseTo(3 * PULT_LANG);
    expect(hoyde).toBeCloseTo(PULT_KORT);
    expect(pulter.every((p) => p.rotasjon === 0)).toBe(true);
  });

  it('bruker standard når layouten ikke finnes for størrelsen', () => {
    expect(lagMal(4, 'mot')).toEqual(lagMal(4));
    expect(lagMal(3, 'blokk')).toEqual(lagMal(3));
    expect(lagMal(2, undefined)).toEqual(lagMal(2));
  });

  it('bruker pulter i forholdet 7:5', () => {
    expect(PULT_LANG / PULT_KORT).toBeCloseTo(7 / 5);
  });
});

describe('layout for klassen og for én gruppe', () => {
  const kart = { oppsett: { ...standardKlasseoppsett(), 4: 'blokk' } };

  it('har en katalog med navn og beskrivelse for hver størrelse', () => {
    expect(oppsettFor(1).map((o) => o.id)).toEqual(['enkel']);
    expect(oppsettFor(2).map((o) => o.id)).toEqual(['rekke', 'mot']);
    expect(oppsettFor(3).map((o) => o.id)).toEqual(['tett', 'apen', 'rekke']);
    expect(oppsettFor(4).map((o) => o.id)).toEqual(['apen', 'tett', 'blokk']);
    expect(oppsettFor(5).map((o) => o.id)).toEqual(['lang-venstre', 'lang-hoyre', 'blokk']);
    for (const [s] of MALER) for (const o of oppsettFor(s)) expect(o.navn && o.beskrivelse).toBeTruthy();
  });

  it('godtar bare layouter som finnes for størrelsen', () => {
    expect(gyldigOppsett(3, 'rekke')).toBe(true);
    expect(gyldigOppsett(4, 'rekke')).toBe(false);
    expect(gyldigOppsett(5, 'hoyre')).toBe(false);
    expect(gyldigOppsett(4, null)).toBe(false);
  });

  it('bruker gruppas eget valg, så klassens valg, så standard', () => {
    expect(effektivtOppsett({ storrelse: 4, oppsett: 'tett' }, kart)).toBe('tett');
    expect(effektivtOppsett({ storrelse: 4, oppsett: null }, kart)).toBe('blokk');
    expect(effektivtOppsett({ storrelse: 3, oppsett: null }, kart)).toBe('tett');
    expect(effektivtOppsett({ storrelse: 4, oppsett: 'mot' }, kart)).toBe('blokk');
    expect(effektivtOppsett({ storrelse: 4, oppsett: null }, { oppsett: { 4: 'ukjent' } })).toBe('apen');
    expect(effektivtOppsett({ storrelse: 5 }, {})).toBe('lang-venstre');
    expect(effektivtOppsett({ storrelse: 1, oppsett: null }, kart)).toBe('enkel');
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
      for (const p of MALER.flatMap(([s, o]) => lagMal(s, o).pulter).filter(erSidelengs)) {
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
      const hoyre = roter({ x: 1, y: 0 }, rot); // gruppas høyre side i rommet
      for (const [storrelse, arm] of MALER.filter(([s]) => s >= 2)) {
        const { pulter } = lagMal(storrelse, arm);
        const iRommet = pulter.map((p) => lokalTilRom(p, pos, rot));
        if (paRekke(pulter)) {
          // På rekke: fra gruppas høyre side mot venstre, også når gruppa står skrått
          const langs = iRommet.map((p) => (p.x - pos.x) * hoyre.x + (p.y - pos.y) * hoyre.y);
          expect(langs.every((v, i) => i === 0 || v < langs[i - 1])).toBe(true);
        } else {
          expect(erMedKlokka(iRommet)).toBe(true);
        }
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
