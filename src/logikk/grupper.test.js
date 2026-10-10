import { describe, expect, it } from 'vitest';
import {
  antallMedEgenRetning,
  automatiskOrientering,
  beregnGruppestorrelser,
  beskrivAvvik,
  bredesteGruppe,
  endreGruppestorrelse,
  gruppenavn,
  grupperOverlapper,
  harEgetOppsett,
  kortGruppenavn,
  lagBordgrupper,
  nyBordgruppe,
  nyNummerering,
  ordneIRutenett,
  rutenettGirPlass,
  settAutomatiskOrientering,
  settGruppenummer,
  settGruppeoppsett,
  settKlasseoppsett,
  standardPosisjoner,
  storrelseForTegning,
  synkLangArm,
} from './grupper.js';
import { effektivtOppsett, lagMal, standardKlasseoppsett } from './maler.js';

const ROM = { bredde: 9, lengde: 10 };
const telle = (liste) => liste.reduce((acc, n) => ({ ...acc, [n]: (acc[n] ?? 0) + 1 }), {});

describe('gruppestørrelser etter prinsippet', () => {
  it('gir 3 grupper med 4 og 3 grupper med 3 for 21 elever og ønsket størrelse 4', () => {
    const storrelser = beregnGruppestorrelser(21, 4);
    expect(storrelser).toHaveLength(6);
    expect(telle(storrelser)).toEqual({ 4: 3, 3: 3 });
  });

  it('følger formelen G = ceil(N/S) og S·G − N små grupper', () => {
    for (let s = 1; s <= 5; s += 1) {
      for (let n = s; n <= 40; n += 1) {
        const g = Math.ceil(n / s);
        const sma = s * g - n;
        if (sma > g) continue; // for få elever til formelen; se egen test
        const storrelser = beregnGruppestorrelser(n, s);
        expect(storrelser).toHaveLength(g);
        expect(storrelser.filter((x) => x === s - 1)).toHaveLength(sma);
        expect(storrelser.filter((x) => x === s)).toHaveLength(g - sma);
      }
    }
  });

  it('fordeler jevnt når det er svært få elever', () => {
    expect(beregnGruppestorrelser(5, 4)).toEqual([3, 2]);
    expect(beregnGruppestorrelser(6, 5)).toEqual([3, 3]);
  });

  it('gir ingen grupper uten elever, og summen er alltid antall elever', () => {
    expect(beregnGruppestorrelser(0, 4)).toEqual([]);
    for (let n = 1; n < 35; n += 1) {
      for (let s = 1; s <= 5; s += 1) {
        expect(beregnGruppestorrelser(n, s).reduce((a, b) => a + b, 0)).toBe(n);
      }
    }
  });
});

describe('avvik', () => {
  it('beskriver elever uten plass og tomme plasser', () => {
    expect(beskrivAvvik(21, 21)).toBeNull();
    expect(beskrivAvvik(23, 21)).toBe('2 elever uten plass');
    expect(beskrivAvvik(22, 21)).toBe('1 elev uten plass');
    expect(beskrivAvvik(21, 24)).toBe('3 tomme plasser');
    expect(beskrivAvvik(21, 22)).toBe('1 tom plass');
  });
});

describe('standard plassering', () => {
  it('gir 3 rader med 2 grupper for 6 grupper i et rom som er lengre enn bredt', () => {
    const pos = standardPosisjoner(6, ROM);
    const xer = new Set(pos.map((p) => p.x.toFixed(3)));
    const yer = new Set(pos.map((p) => p.y.toFixed(3)));
    expect(xer.size).toBe(2);
    expect(yer.size).toBe(3);
  });

  it('holder alle grupper inne i rommet', () => {
    for (let n = 1; n <= 12; n += 1) {
      for (const p of standardPosisjoner(n, ROM)) {
        expect(p.x).toBeGreaterThan(0);
        expect(p.x).toBeLessThan(ROM.bredde);
        expect(p.y).toBeGreaterThan(0);
        expect(p.y).toBeLessThan(ROM.lengde);
      }
    }
  });

  it('nummererer gruppene fra 1 og lager én plass per elev', () => {
    const grupper = lagBordgrupper([4, 4, 3], ROM);
    expect(grupper.map((g) => g.nummer)).toEqual([1, 2, 3]);
    expect(grupper.map((g) => g.plasser.map((p) => p.nummer))).toEqual([[1, 2, 3, 4], [1, 2, 3, 4], [1, 2, 3]]);
    expect(grupper.every((g) => g.rotasjon === null)).toBe(true);
  });

  it('flytter grupper tilbake til rutenettet: automatiske forblir automatiske, de andre settes rett', () => {
    const grupper = lagBordgrupper([4, 4, 3], ROM).map((g, i) => ({ ...g, x: 0, y: 0, rotasjon: [30, null, -15][i] }));
    const ordnet = ordneIRutenett(grupper, ROM);
    expect(ordnet.map((g) => ({ x: g.x, y: g.y }))).toEqual(standardPosisjoner(3, ROM));
    expect(ordnet.map((g) => g.rotasjon)).toEqual([0, null, 0]);
  });

  it('plasserer gruppene som før når de har standardlayout', () => {
    const bredeste = lagMal(4).bredde;
    for (let n = 1; n <= 16; n += 1) expect(standardPosisjoner(n, ROM, bredeste)).toEqual(standardPosisjoner(n, ROM));
  });

  it('gir brede grupper (tre på rekke) færre kolonner i et smalt rom', () => {
    const smalt = { bredde: 7, lengde: 10 };
    const kart = { oppsett: { ...standardKlasseoppsett(), 3: 'rekke' }, bordgrupper: [] };
    const grupper = lagBordgrupper([3, 3, 3, 3, 3, 3, 3, 3, 3, 3], smalt, kart);
    const kolonner = new Set(grupper.map((g) => g.x.toFixed(3))).size;
    expect(kolonner).toBe(2);
    expect(bredesteGruppe(grupper, kart)).toBeCloseTo(2.52);
    expect(new Set(lagBordgrupper([3, 3, 3, 3, 3, 3, 3, 3, 3, 3], smalt).map((g) => g.x.toFixed(3))).size).toBe(3);
  });
});

describe('grupper som overlapper', () => {
  const pa = (storrelse, x, y, rotasjon = 0) => ({ storrelse, oppsett: null, x, y, rotasjon });
  const paRekke = { ...standardKlasseoppsett(), 3: 'rekke' };

  it('ser om pultene i to grupper står oppå hverandre, med layout og retning', () => {
    const kart = (...bordgrupper) => ({ oppsett: paRekke, bordgrupper });
    // Tre pulter på rekke er 2,52 m brede, standardlayouten for 3 er 1,2 m.
    expect(grupperOverlapper(kart(pa(3, 2, 5), pa(3, 4.6, 5)), ROM)).toBe(false);
    expect(grupperOverlapper(kart(pa(3, 2, 5), pa(3, 4.4, 5)), ROM)).toBe(true);
    expect(grupperOverlapper(kart(pa(3, 2, 5, 90), pa(3, 4.4, 5, 90)), ROM)).toBe(false);
    const standard = { oppsett: standardKlasseoppsett(), bordgrupper: [pa(3, 2, 5), pa(3, 4.4, 5)] };
    expect(grupperOverlapper(standard, ROM)).toBe(false);
    expect(grupperOverlapper(kart(pa(3, 2, 5)), ROM)).toBe(false);
  });

  it('finner ingen overlapp i standardplasseringen', () => {
    for (const n of [12, 21, 24, 28, 30]) {
      for (const storrelse of [2, 3, 4]) {
        const bordgrupper = lagBordgrupper(beregnGruppestorrelser(n, storrelse), ROM);
        const kart = { oppsett: standardKlasseoppsett(), bordgrupper };
        expect(grupperOverlapper(kart, ROM)).toBe(false);
        const rett = { ...kart, bordgrupper: settAutomatiskOrientering(kart.bordgrupper, false) };
        expect(grupperOverlapper(rett, ROM)).toBe(false);
      }
    }
  });

  it('legger en ny gruppe der den ikke står oppå andre, også med tre pulter på rekke', () => {
    const bordgrupper = lagBordgrupper(beregnGruppestorrelser(30, 3), ROM, { oppsett: paRekke });
    for (const automatisk of [true, false]) {
      const kart = { oppsett: paRekke, bordgrupper: settAutomatiskOrientering(bordgrupper, automatisk) };
      expect(grupperOverlapper(kart, ROM)).toBe(false);
      const ny = nyBordgruppe(kart, 3, ROM);
      expect(grupperOverlapper({ ...kart, bordgrupper: [...kart.bordgrupper, ny] }, ROM)).toBe(false);
      expect(ny.nummer).toBe(11);
    }
  });

  it('foreslår «Ordne i rutenett» når en bredere layout gir overlapp som rutenettet løser', () => {
    const smalt = { bredde: 7, lengde: 10 };
    const bordgrupper = lagBordgrupper(beregnGruppestorrelser(30, 3), smalt);
    const kart = { oppsett: standardKlasseoppsett(), bordgrupper };
    expect(rutenettGirPlass(kart, smalt)).toBe(false);
    const bred = settKlasseoppsett(kart, 3, 'rekke');
    expect(grupperOverlapper(bred, smalt)).toBe(true);
    expect(rutenettGirPlass(bred, smalt)).toBe(true);
    const ordnet = { ...bred, bordgrupper: ordneIRutenett(bred.bordgrupper, smalt, bred) };
    expect(grupperOverlapper(ordnet, smalt)).toBe(false);
    expect(rutenettGirPlass(ordnet, smalt)).toBe(false);
  });

  it('foreslår ikke «Ordne i rutenett» når gruppene overlapper også i rutenettet', () => {
    const trangt = { bredde: 3, lengde: 4 }; // fire firergrupper får ikke plass
    const kart = { oppsett: standardKlasseoppsett(), bordgrupper: lagBordgrupper([4, 4, 4, 4], trangt) };
    expect(grupperOverlapper(kart, trangt)).toBe(true);
    expect(rutenettGirPlass(kart, trangt)).toBe(false);
  });
});

describe('automatisk orientering for hele klasserommet', () => {
  const grupper = lagBordgrupper([4, 4, 3], ROM);
  const med = (...rotasjoner) => grupper.map((g, i) => ({ ...g, rotasjon: rotasjoner[i] }));

  it('er på for alle, ingen eller noen av gruppene', () => {
    expect(automatiskOrientering(grupper)).toBe('alle');
    expect(automatiskOrientering(med(0, 0, 30))).toBe('ingen');
    expect(automatiskOrientering(med(null, 0, null))).toBe('noen');
    expect(automatiskOrientering([])).toBe('tom');
  });

  it('setter alle gruppene rett når den slås av, og automatiske når den slås på', () => {
    expect(settAutomatiskOrientering(grupper, false).map((g) => g.rotasjon)).toEqual([0, 0, 0]);
    expect(settAutomatiskOrientering(med(0, 45, null), true).map((g) => g.rotasjon)).toEqual([null, null, null]);
  });

  it('teller bare grupper som er dreid til en annen retning enn rett', () => {
    expect(antallMedEgenRetning(med(null, 0, 30))).toBe(1);
    expect(antallMedEgenRetning(med(360, -15, 12.5))).toBe(2);
    expect(antallMedEgenRetning(grupper)).toBe(0);
  });

  it('lar nye grupper stå rett når ingen grupper har automatisk orientering', () => {
    const kart = { oppsett: standardKlasseoppsett(), bordgrupper: med(0, 0, 0) };
    expect(nyBordgruppe(kart, 4, ROM).rotasjon).toBe(0);
    expect(lagBordgrupper([4, 4], ROM, kart).map((g) => g.rotasjon)).toEqual([0, 0]);
    const blandet = { ...kart, bordgrupper: med(null, 0, 0) };
    expect(nyBordgruppe(blandet, 4, ROM).rotasjon).toBeNull();
    expect(lagBordgrupper([4], ROM, blandet)[0].rotasjon).toBeNull();
    expect(nyBordgruppe({ ...kart, bordgrupper: [] }, 4, ROM).rotasjon).toBeNull();
  });

  it('gir en ny gruppe neste nummer og neste plass i rutenettet', () => {
    const kart = { oppsett: standardKlasseoppsett(), bordgrupper: grupper };
    const ny = nyBordgruppe(kart, 3, ROM);
    expect(ny.nummer).toBe(4);
    expect({ x: ny.x, y: ny.y }).toEqual(standardPosisjoner(4, ROM)[3]);
    expect(ny.oppsett).toBeNull();
  });
});

describe('endre en bordgruppe', () => {
  const [gruppe] = lagBordgrupper([4], ROM);
  const full = { ...gruppe, plasser: gruppe.plasser.map((p, i) => ({ ...p, elevId: `e${i}`, last: i === 0 })) };

  it('beholder elevene på plassene som finnes fortsatt', () => {
    const mindre = endreGruppestorrelse(full, 3);
    expect(mindre.plasser.map((p) => p.elevId)).toEqual(['e0', 'e1', 'e2']);
    expect(mindre.plasser[0].last).toBe(true);
    const storre = endreGruppestorrelse(full, 5);
    expect(storre.plasser.map((p) => p.elevId)).toEqual(['e0', 'e1', 'e2', 'e3', null]);
  });

  it('gir gruppa klassens layout for den nye størrelsen', () => {
    const egen = { ...full, oppsett: 'blokk' };
    expect(endreGruppestorrelse(egen, 5).oppsett).toBeNull();
    expect(endreGruppestorrelse(egen, 3).oppsett).toBeNull();
  });

  it('bruker klikkrekkefølgen som ny nummerering', () => {
    const ny = nyNummerering(full, [3, 2, 1, 0]);
    expect(ny.plasser.map((p) => p.nummer)).toEqual([4, 3, 2, 1]);
  });
});

describe('gruppenavn og gruppenummer', () => {
  const grupper = lagBordgrupper([4, 4, 3, 3], ROM);

  it('viser «Gruppe N» når gruppa ikke har eget navn', () => {
    expect(gruppenavn(grupper[1])).toBe('Gruppe 2');
    expect(kortGruppenavn(grupper[1])).toBe('Gr. 2');
    expect(gruppenavn({ ...grupper[1], navn: '  Løvene ' })).toBe('Løvene');
    expect(kortGruppenavn({ ...grupper[1], navn: 'Løvene' })).toBe('Løvene');
  });

  it('bytter nummer med gruppa som hadde nummeret fra før', () => {
    const ny = settGruppenummer(grupper, grupper[3].id, 1);
    expect(ny.map((g) => g.nummer)).toEqual([4, 2, 3, 1]);
    expect(new Set(ny.map((g) => g.nummer)).size).toBe(4);
  });

  it('holder nummeret innenfor antall grupper', () => {
    expect(settGruppenummer(grupper, grupper[0].id, 9).map((g) => g.nummer)).toEqual([4, 2, 3, 1]);
  });
});

describe('layout', () => {
  const kart = { oppsett: standardKlasseoppsett(), bordgrupper: lagBordgrupper([4, 4, 3, 5], ROM) };
  const [fire, , tre, fem] = kart.bordgrupper;

  it('gir én gruppe egen layout uten å røre elevene, låsene eller nummereringen', () => {
    const med = {
      ...fire,
      plasser: [
        { nummer: 2, elevId: 'a', last: true },
        { nummer: 1, elevId: 'b', last: false },
        { nummer: 3, elevId: null, last: false },
        { nummer: 4, elevId: 'c', last: false },
      ],
    };
    const ny = settGruppeoppsett(med, 'blokk', kart);
    expect(ny.oppsett).toBe('blokk');
    expect(ny.plasser).toBe(med.plasser);
    expect(effektivtOppsett(ny, kart)).toBe('blokk');
    expect(harEgetOppsett(ny, kart)).toBe(true);
  });

  it('lar gruppa følge klassen når klassens layout velges, eller null', () => {
    expect(settGruppeoppsett({ ...fire, oppsett: 'tett' }, 'apen', kart).oppsett).toBeNull();
    expect(settGruppeoppsett({ ...fire, oppsett: 'tett' }, null, kart).oppsett).toBeNull();
    expect(settGruppeoppsett(fire, 'mot', kart)).toBe(fire);
    expect(harEgetOppsett(fire, kart)).toBe(false);
  });

  it('gir alle gruppene med samme størrelse klassens nye valg, også de med egen layout', () => {
    const med = {
      ...kart,
      bordgrupper: [{ ...fire, oppsett: 'blokk' }, kart.bordgrupper[1], { ...tre, oppsett: 'apen' }, fem],
    };
    const ny = settKlasseoppsett(med, 4, 'tett');
    expect(ny.oppsett[4]).toBe('tett');
    expect(ny.bordgrupper.map((g) => g.oppsett)).toEqual([null, null, 'apen', null]);
    expect(ny.bordgrupper.map((g) => effektivtOppsett(g, ny))).toEqual(['tett', 'tett', 'apen', 'lang-venstre']);
    expect(settKlasseoppsett(med, 4, 'rekke')).toBe(med);
  });

  it('viser firergruppa på Layout-knappen, ellers 3, 2 eller 5', () => {
    const med = (...storrelser) => storrelser.map((storrelse) => ({ storrelse }));
    expect(storrelseForTegning(med(3, 4, 5))).toBe(4);
    expect(storrelseForTegning(med(5, 3, 2))).toBe(3);
    expect(storrelseForTegning(med(5, 2, 1))).toBe(2);
    expect(storrelseForTegning(med(5, 1))).toBe(5);
    expect(storrelseForTegning(med(1))).toBe(4);
    expect(storrelseForTegning([])).toBe(4);
  });

  it('holder langArm i takt med layouten for eldre versjoner av appen', () => {
    const hoyre = synkLangArm(settKlasseoppsett(kart, 5, 'lang-hoyre'));
    expect(hoyre.bordgrupper.map((g) => g.langArm)).toEqual(['venstre', 'venstre', 'venstre', 'hoyre']);
    const bordgrupper = hoyre.bordgrupper.map((g) => settGruppeoppsett(g, 'blokk', hoyre));
    const blokk = synkLangArm({ ...hoyre, bordgrupper });
    expect(blokk.bordgrupper[3].langArm).toBe('venstre');
  });
});
