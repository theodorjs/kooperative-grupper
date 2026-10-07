// Tolker ferier fra en kommunal skolerute-side (HTML eller ren tekst).
//
// Kommunene skriver skoleruta på mange måter, for eksempel:
//   "Høstferie: 28. september – 2. oktober"
//   "Høstferie uke 40"
//   "Juleferie 21.12.2026 – 1.1.2027"
//   "Juleferie: Siste skoledag 18. desember, første skoledag 4. januar"
// Tolkningen leter etter ord som slutter på "ferie" og leser datoene som
// står etter. Årstall som mangler, hentes fra skoleåret på siden
// ("Skoleåret 2026/2027"): august–desember er første år, januar–juli andre.

import { erGyldigDato, fraDagnummer, leggTilDager, tilDagnummer } from './uke.js';

const MANEDER = {
  jan: 1, januar: 1,
  feb: 2, februar: 2,
  mar: 3, mars: 3,
  apr: 4, april: 4,
  mai: 5,
  jun: 6, juni: 6,
  jul: 7, juli: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  okt: 10, oktober: 10,
  nov: 11, november: 11,
  des: 12, desember: 12,
};

const MANEDSORD = Object.keys(MANEDER).sort((a, b) => b.length - a.length).join('|');
const FERIEORD_KILDE = '(høst|jule?|vinter|påske|sommer|pinse)ferie[nr]?';
const FERIEORD = new RegExp(FERIEORD_KILDE, 'gi');
const HAR_FERIEORD = new RegExp(FERIEORD_KILDE, 'i');
const SKOLEAAR = /(20\d\d)\s*[/–—-]\s*(20\d\d|\d\d)\b/;
const MAKS_FERIEDAGER = 80;
// En linje under en overskrift brukes bare hvis den ser ut som en dato.
const DATOLINJE = /^(\d|uke\b|fra\b|f\.?o\.?m|(man|tirs|ons|tors|fre|lør|søn)dag)/i;

const ENTITETER = {
  nbsp: ' ', ndash: '–', mdash: '—', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>',
  aring: 'å', Aring: 'Å', aelig: 'æ', AElig: 'Æ', oslash: 'ø', Oslash: 'Ø', shy: '',
};

/** Gjør HTML om til tekstlinjer. Tabellrader og avsnitt blir egne linjer. */
export function htmlTilTekst(html) {
  return html
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6]|dt|dd|section|article|table|caption|ul|ol)>/gi, '\n')
    .replace(/<\/(td|th)>/gi, ' \t ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (hele, navn) => ENTITETER[navn] ?? hele)
    .split('\n')
    .map((linje) => linje.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

const iso = (aar, maned, dag) =>
  `${aar}-${String(maned).padStart(2, '0')}-${String(dag).padStart(2, '0')}`;

function aarForManed(maned, skolearStart) {
  if (!skolearStart) return null;
  return maned >= 8 ? skolearStart : skolearStart + 1;
}

/** Mandag i ISO-uke `uke` i år `aar`. */
function mandagIUke(aar, uke) {
  const jan4 = tilDagnummer(iso(aar, 1, 4));
  const ukedag = (new Date(jan4 * 86400000).getUTCDay() + 6) % 7;
  return fraDagnummer(jan4 - ukedag + (uke - 1) * 7);
}

/**
 * Finner datoene i en tekstbit, i den rekkefølgen de står. Hver dato får med
 * seg om den er merket som "siste skoledag" eller "første skoledag".
 */
function finnDatoer(tekst, skolearStart) {
  const funn = [];
  const merk = (indeks) => {
    const for_ = tekst.slice(Math.max(0, indeks - 30), indeks).toLowerCase();
    if (/siste\s+skoledag/.test(for_)) return 'siste';
    if (/(første|1\.)\s+skoledag/.test(for_)) return 'forste';
    return null;
  };

  // "28. september 2026", "28. sept.", "28.–2. oktober" (første dag uten måned)
  const tekstlig = new RegExp(
    `(\\d{1,2})\\.?(?:\\s*(?:–|—|-|til)\\s*(\\d{1,2})\\.?)?\\s*(${MANEDSORD})\\.?(?:\\s+(20\\d\\d))?(?![a-zæøå])`,
    'gi',
  );
  for (const m of tekst.matchAll(tekstlig)) {
    const maned = MANEDER[m[3].toLowerCase()];
    const aar = m[4] ? Number(m[4]) : aarForManed(maned, skolearStart);
    if (m[2]) {
      // "28.–2. oktober": første dag hører til måneden før hvis den er større.
      const forsteDag = Number(m[1]);
      const forsteManed = forsteDag > Number(m[2]) ? (maned === 1 ? 12 : maned - 1) : maned;
      const forsteAar = aar && forsteManed === 12 && maned === 1 ? aar - 1 : aar;
      funn.push({ indeks: m.index, dag: forsteDag, maned: forsteManed, aar: forsteAar, merke: merk(m.index) });
      funn.push({ indeks: m.index + 1, dag: Number(m[2]), maned, aar, merke: null });
    } else {
      funn.push({ indeks: m.index, dag: Number(m[1]), maned, aar, merke: merk(m.index) });
    }
  }

  // "28.09.2026", "28.9.26", "28.9."
  const tall = /(?<![\d.])(\d{1,2})\.(\d{1,2})\.(?:(20\d\d|\d\d)(?!\d))?/g;
  for (const m of tekst.matchAll(tall)) {
    const maned = Number(m[2]);
    if (maned < 1 || maned > 12) continue;
    let aar = m[3] ? Number(m[3]) : aarForManed(maned, skolearStart);
    if (aar && aar < 100) aar += 2000;
    funn.push({ indeks: m.index, dag: Number(m[1]), maned, aar, merke: merk(m.index) });
  }

  return funn.sort((a, b) => a.indeks - b.indeks);
}

function finnUker(tekst, skolearStart) {
  const m = tekst.match(/\buke\s*(\d{1,2})(?:\s*(?:–|—|-|og|til)\s*(?:uke\s*)?(\d{1,2}))?/i);
  if (!m || !skolearStart) return null;
  const fraUke = Number(m[1]);
  const tilUke = m[2] ? Number(m[2]) : fraUke;
  if (fraUke < 1 || fraUke > 53 || tilUke < 1 || tilUke > 53) return null;
  const aar = (uke) => (uke >= 31 ? skolearStart : skolearStart + 1);
  return { fra: mandagIUke(aar(fraUke), fraUke), til: leggTilDager(mandagIUke(aar(tilUke), tilUke), 4) };
}

/** Lager en periode fra datoene i en tekstbit, eller null. */
function lagPeriode(tekst, skolearStart) {
  const datoer = finnDatoer(tekst, skolearStart);
  if (datoer.length >= 2) {
    const forste = datoer[0];
    const siste = datoer[datoer.length - 1];
    // Mangler årstall og skoleår, brukes årstallet fra den andre datoen.
    const aarFra = forste.aar ?? siste.aar;
    let aarTil = siste.aar ?? forste.aar;
    if (!aarFra || !aarTil) return null;
    let fra = iso(aarFra, forste.maned, forste.dag);
    let til = iso(aarTil, siste.maned, siste.dag);
    if (!siste.aar && til < fra) til = iso(aarTil + 1, siste.maned, siste.dag);
    if (!erGyldigDato(fra) || !erGyldigDato(til)) return null;
    if (forste.merke === 'siste') fra = leggTilDager(fra, 1);
    if (siste.merke === 'forste') til = leggTilDager(til, -1);
    return { fra, til };
  }
  return finnUker(tekst, skolearStart);
}

const storForbokstav = (ord) => ord.charAt(0).toUpperCase() + ord.slice(1).toLowerCase();

function ferienavn(ord) {
  const rot = ord.toLowerCase().replace(/ferie[nr]?$/, '').replace(/^jul$/, 'jule');
  return storForbokstav(`${rot}ferie`);
}

/**
 * Tolker skoleruta. Returnerer ferier sortert etter dato:
 * [{ navn: 'Høstferie', fra: '2026-09-28', til: '2026-10-02' }, ...]
 */
export function tolkSkolerute(innhold) {
  const tekst = /<[a-z][\s\S]*>/i.test(innhold) ? htmlTilTekst(innhold) : innhold;
  const linjer = tekst.split('\n');
  const ferier = [];
  let skolearStart = null;

  linjer.forEach((linje, i) => {
    const aar = linje.match(SKOLEAAR);
    if (aar) {
      const forste = Number(aar[1]);
      const andre = Number(aar[2].length === 2 ? `20${aar[2]}` : aar[2]);
      if (andre === forste + 1) skolearStart = forste;
    }

    const treff = [...linje.matchAll(FERIEORD)];
    treff.forEach((t, j) => {
      const slutt = treff[j + 1]?.index ?? linje.length;
      let bit = linje.slice(t.index + t[0].length, slutt);
      let periode = lagPeriode(bit, skolearStart);
      // Står datoene på linja under (overskrift + avsnitt), les videre.
      const ingenDatoer = finnDatoer(bit, skolearStart).length === 0;
      if (!periode && ingenDatoer && j === treff.length - 1) {
        for (let n = 1; n <= 2 && !periode && i + n < linjer.length; n += 1) {
          if (HAR_FERIEORD.test(linjer[i + n]) || !DATOLINJE.test(linjer[i + n])) break;
          bit = `${bit} ${linjer[i + n]}`;
          periode = lagPeriode(bit, skolearStart);
        }
      }
      if (!periode) return;
      const lengde = tilDagnummer(periode.til) - tilDagnummer(periode.fra);
      if (lengde < 0 || lengde > MAKS_FERIEDAGER) return;
      ferier.push({ navn: ferienavn(t[0]), ...periode });
    });
  });

  const unike = new Map(ferier.map((f) => [`${f.navn}|${f.fra}|${f.til}`, f]));
  return [...unike.values()].sort((a, b) => a.fra.localeCompare(b.fra) || a.navn.localeCompare(b.navn));
}
