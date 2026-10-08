// Rollebiblioteket: alle samarbeidsrollene læreren har, med ikon, navn,
// farge og beskrivelse. Rotasjonen i «Denne uka» har fire plasser
// (rolle 1–4). Hver plass peker på en rolle i biblioteket.
//
// Hvordan plassene slås sammen i små grupper, står i roller.js.

import { nyId } from '../data/id.js';
import { ROLLENUMRE } from './roller.js';

// Teksten er hentet fra plakatene for samarbeidsrollene.
export const STANDARDROLLER = [
  {
    id: 'materialforvalter',
    navn: 'Materialforvalter',
    tillegg: '(og ordenselev)',
    ikon: '🧹',
    farge: '#2E7D32',
    beskrivelse: [
      'I løpet av dagen',
      '- Tørke av de hvite tavlene etter hver time',
      '- Se etter at det er orden i hyllene til gruppa. Si fra om det må ryddes.',
      '- Se etter at det er orden og rent på pultene og rundt pultene.',
      '- Hente materiell, og si fra til gruppen om det er utstyr som mangler',
      'På slutten av dagen',
      '- Feie, tømme søppel',
      '- Sette opp ny timeplan for neste dag',
    ].join('\n'),
  },
  {
    id: 'oppmuntrer',
    navn: 'Oppmuntrer',
    tillegg: '',
    ikon: '🙌',
    farge: '#E65100',
    beskrivelse: 'Gi masse ROS og OPPMUNTRING til medlemmene av gruppen din mens dere jobber.',
  },
  {
    id: 'reporter',
    navn: 'Reporter',
    tillegg: '',
    ikon: '📢',
    farge: '#1565C0',
    beskrivelse: [
      '- Les felles informasjon høyt for gruppa.',
      '- Rapporter gruppens svar til klassen.',
      '- Skriv felles svar.',
    ].join('\n'),
  },
  {
    id: 'sjekker',
    navn: 'Sjekker',
    tillegg: '',
    ikon: '✅',
    farge: '#6A1B9A',
    beskrivelse: [
      '- Sjekk at alle på gruppen vet hva de skal gjøre.',
      '- Sjekk at alle har forstått oppgaven.',
      '- Sjekk at alle på gruppen er enige i et gruppesvar.',
      '- Sjekk at alle på gruppen kan forklare / gjøre rede for svaret / informasjonen.',
      '- Spør lærer om hjelp for gruppen.',
    ].join('\n'),
  },
];

export const STANDARD_ROTASJONSROLLER = STANDARDROLLER.map((r) => r.id);

/**
 * Farger nye roller kan få: de fire rollefargene fra plakatene og fargene
 * fra Min bruksanvisning som er mørke nok til hvit tekst.
 */
export const ROLLEFARGER = [
  '#2E7D32', '#E65100', '#1565C0', '#6A1B9A',
  '#0E9384', '#F4602A', '#2F6FB5', '#4A9E3F', '#8046C8', '#D23C7B',
];

export const IKONFORSLAG = ['🧹', '🙌', '📢', '✅', '⏱️', '📝', '🔍', '💡', '🎯', '🗣️', '👂', '🧭', '📚', '🤝', '⭐', '🎨'];

const MAKS_NAVN = 40;
const MAKS_TILLEGG = 60;
const MAKS_IKON = 8;
const MAKS_BESKRIVELSE = 2000;

export const lagStandardroller = () => STANDARDROLLER.map((r) => ({ ...r }));

const erFarge = (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
const tekst = (v, maks) => (typeof v === 'string' ? v : '').slice(0, maks);

function rensRolle(r, i) {
  return {
    id: tekst(r.id, 80) || `rolle-${i}`,
    navn: tekst(r.navn, MAKS_NAVN).trim() || 'Rolle',
    tillegg: tekst(r.tillegg, MAKS_TILLEGG).trim(),
    ikon: tekst(r.ikon, MAKS_IKON).trim(),
    farge: erFarge(r.farge) ? r.farge.toUpperCase() : ROLLEFARGER[i % ROLLEFARGER.length],
    beskrivelse: tekst(r.beskrivelse, MAKS_BESKRIVELSE),
  };
}

/** Rydder rollene fra lagring eller import. Mangler de, brukes standardrollene. */
export function normaliserRoller(roller) {
  if (!Array.isArray(roller)) return lagStandardroller();
  const sett = new Set();
  const rensede = roller
    .filter((r) => r && typeof r === 'object')
    .map(rensRolle)
    .filter((r) => !sett.has(r.id) && sett.add(r.id));
  return rensede.length >= ROLLENUMRE.length ? rensede : lagStandardroller();
}

/**
 * Sørger for at rotasjonen har fire ulike roller som finnes i biblioteket.
 * Plasser som mangler, fylles med standardrollen eller første ledige rolle.
 */
export function normaliserRotasjonsroller(ider, roller) {
  const finnes = new Set(roller.map((r) => r.id));
  const valgt = [];
  ROLLENUMRE.forEach((_, i) => {
    const id = Array.isArray(ider) ? ider[i] : undefined;
    if (finnes.has(id) && !valgt.includes(id)) valgt.push(id);
    else valgt.push(null);
  });
  return valgt.map((id, i) => {
    if (id) return id;
    const kandidater = [STANDARD_ROTASJONSROLLER[i], ...roller.map((r) => r.id)];
    const ledig = kandidater.find((k) => finnes.has(k) && !valgt.includes(k));
    valgt[i] = ledig;
    return ledig;
  });
}

/** Rollene i rotasjonen, i plassrekkefølge: [{ nummer: 1, ...rolle }, ...]. */
export function rotasjonsroller(data) {
  const roller = new Map(data.roller.map((r) => [r.id, r]));
  return data.innstillinger.rotasjonsroller.map((id, i) => ({ ...roller.get(id), nummer: i + 1 }));
}

/** Plassnummeret (1–4) rollen har i rotasjonen, eller null. */
export function plassIRotasjonen(data, rolleId) {
  const i = data.innstillinger.rotasjonsroller.indexOf(rolleId);
  return i === -1 ? null : i + 1;
}

export function nesteFarge(roller) {
  const brukt = new Set(roller.map((r) => r.farge.toUpperCase()));
  return ROLLEFARGER.find((f) => !brukt.has(f)) ?? ROLLEFARGER[roller.length % ROLLEFARGER.length];
}

export function leggTilRolle(data, rolle) {
  const ny = rensRolle({ ...rolle, id: nyId() }, data.roller.length);
  return { ...data, roller: [...data.roller, ny] };
}

export function endreRolle(data, rolleId, endring) {
  return {
    ...data,
    roller: data.roller.map((r, i) => {
      if (r.id !== rolleId) return r;
      const navn = typeof endring.navn === 'string' && endring.navn.trim() ? endring.navn : r.navn;
      return rensRolle({ ...r, ...endring, navn, id: r.id }, i);
    }),
  };
}

/** Sletter en rolle. Roller som brukes i rotasjonen, kan ikke slettes. */
export function slettRolle(data, rolleId) {
  if (plassIRotasjonen(data, rolleId) !== null) return data;
  return { ...data, roller: data.roller.filter((r) => r.id !== rolleId) };
}

/** Setter en rolle på en plass i rotasjonen. Står den på en annen plass, bytter de. */
export function settRotasjonsrolle(data, nummer, rolleId) {
  const ider = [...data.innstillinger.rotasjonsroller];
  const fra = ider.indexOf(rolleId);
  if (fra !== -1) ider[fra] = ider[nummer - 1];
  ider[nummer - 1] = rolleId;
  return { ...data, innstillinger: { ...data.innstillinger, rotasjonsroller: ider } };
}

/**
 * Gjør beskrivelsen om til blokker for visning. Linjer som starter med
 * «-», «•» eller «*», blir punkter. En linje rett før punkter blir en
 * underoverskrift; andre linjer blir vanlige avsnitt.
 */
export function tolkBeskrivelse(tekstinnhold) {
  const linjer = tekstinnhold.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const erPunkt = (l) => /^[-•*]\s*/.test(l);
  const blokker = [];
  linjer.forEach((linje, i) => {
    if (erPunkt(linje)) {
      const punkt = linje.replace(/^[-•*]\s*/, '');
      const forrige = blokker.at(-1);
      if (forrige?.type === 'liste') forrige.punkter.push(punkt);
      else blokker.push({ type: 'liste', punkter: [punkt] });
    } else {
      const neste = linjer[i + 1];
      blokker.push({ type: neste && erPunkt(neste) ? 'overskrift' : 'avsnitt', tekst: linje });
    }
  });
  return blokker;
}
