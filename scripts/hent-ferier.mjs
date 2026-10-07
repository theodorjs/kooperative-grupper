#!/usr/bin/env node
// Henter skoleruta til Moss kommune, tolker feriene og skriver dem til
// public/ferier-moss.json. Kjøres av GitHub Actions før nettsiden bygges.
//
//   node scripts/hent-ferier.mjs                     henter fra kommunen
//   node scripts/hent-ferier.mjs --fil side.html     tolker en lagret side (for testing)
//   node scripts/hent-ferier.mjs --reserve <url>     bruker den publiserte fila hvis henting feiler
//
// Skriptet stopper aldri publiseringen: feiler alt, beholdes fila som den er,
// og det skrives en advarsel i loggen til GitHub Actions. Finner det ingen
// ferier, prøver det lenker på siden som handler om skolerute eller ferier, og
// skriver ut en diagnose av hva siden faktisk inneholdt.

import { readFile, writeFile } from 'node:fs/promises';
import { FERIEKILDE, tolkFeriefil } from '../src/data/ferieimport.js';
import { htmlTilTekst, tolkSkolerute } from '../src/logikk/skolerute.js';
import { iDag, leggTilDager } from '../src/logikk/uke.js';

const UTFIL = new URL(`../public/${FERIEKILDE.fil}`, import.meta.url);
const BRUKERAGENT =
  'Mozilla/5.0 (compatible; Kooperative-grupper/1.0; +https://github.com/theodorjs/Kooperative-Grupper)';

const argument = (navn) => {
  const i = process.argv.indexOf(navn);
  return i === -1 ? null : process.argv[i + 1];
};

const advarsel = (melding) => console.log(`::warning title=Ferieimport::${melding}`);

async function hentSide(url) {
  const svar = await fetch(url, {
    headers: { 'User-Agent': BRUKERAGENT, Accept: 'text/html,application/json' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!svar.ok) throw new Error(`${url} svarte ${svar.status} ${svar.statusText}`);
  return {
    url: svar.url || url,
    status: svar.status,
    type: svar.headers.get('content-type') ?? 'ukjent',
    tekst: await svar.text(),
  };
}

const hentTekst = async (url) => (await hentSide(url)).tekst;

/** Lenker på siden, med lenketekst, gjort om til fulle adresser. */
function finnLenker(html, base) {
  const lenker = [];
  for (const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    try {
      const url = new URL(m[1].replace(/&amp;/g, '&'), base);
      const tekst = htmlTilTekst(m[2]).replace(/\s+/g, ' ').trim();
      if (url.protocol.startsWith('http')) lenker.push({ url: url.href, tekst });
    } catch {
      // Ugyldig lenke
    }
  }
  return lenker;
}

const omSkolerute = (l) => /skolerut|ferie|fridag/i.test(`${l.url} ${l.tekst}`);
const erPdf = (l) => /\.pdf(\?|$)/i.test(l.url);

/** Prøver undersider på samme nettsted som ser ut til å handle om skoleruta. */
async function provUndersider(side) {
  const vert = new URL(side.url).host;
  const kandidater = [...new Map(
    finnLenker(side.tekst, side.url)
      .filter((l) => omSkolerute(l) && !erPdf(l) && new URL(l.url).host === vert && l.url !== side.url)
      .map((l) => [l.url, l]),
  ).values()].slice(0, 6);
  for (const lenke of kandidater) {
    try {
      const ferier = tolkSkolerute(await hentTekst(lenke.url));
      console.log(`Prøvde ${lenke.url}: ${ferier.length} ferier`);
      if (ferier.length) return { ferier, url: lenke.url };
    } catch (feil) {
      console.log(`Prøvde ${lenke.url}: ${feil.message}`);
    }
  }
  return null;
}

/** Skriver ut hva siden inneholdt, slik at tolkningen kan rettes. */
function diagnose(side) {
  const tekst = htmlTilTekst(side.tekst);
  const tittel = side.tekst.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? '(ingen)';
  const ferielinjer = tekst.split('\n').filter((l) => /ferie/i.test(l));
  const lenker = finnLenker(side.tekst, side.url).filter((l) => omSkolerute(l) || erPdf(l));

  console.log('::group::Diagnose av skolerute-siden');
  console.log(`Adresse:        ${side.url}`);
  console.log(`Status og type: ${side.status}, ${side.type}`);
  console.log(`Størrelse:      ${side.tekst.length} tegn HTML, ${tekst.length} tegn tekst`);
  console.log(`Tittel:         ${tittel}`);
  console.log(`"ferie" i HTML: ${(side.tekst.match(/ferie/gi) ?? []).length} ganger, i teksten: ${ferielinjer.length} linjer`);
  if (/just a moment|attention required|captcha|access denied/i.test(`${tittel} ${tekst.slice(0, 500)}`)) {
    console.log('Siden ser ut til å være en sperre mot automatisk henting.');
  } else if (tekst.length < 800) {
    console.log('Siden har nesten ikke tekst. Innholdet lages trolig med JavaScript i nettleseren.');
  }
  console.log('Linjer med "ferie":');
  for (const l of ferielinjer.slice(0, 12)) console.log(`  ${l.slice(0, 200)}`);
  console.log('Lenker om skolerute, ferier eller PDF:');
  for (const l of lenker.slice(0, 15)) console.log(`  ${l.tekst.slice(0, 60) || '(uten tekst)'} -> ${l.url}`);
  console.log('::endgroup::');
}

async function skriv(innhold) {
  await writeFile(UTFIL, `${JSON.stringify(innhold, null, 2)}\n`);
}

async function brukReserve() {
  const url = argument('--reserve');
  if (!url) return false;
  try {
    const reserve = tolkFeriefil(JSON.parse(await hentTekst(url)));
    if (!reserve) return false;
    // Fila i repoet kan være nyere enn den publiserte (for eksempel lagt inn for hånd).
    const iRepoet = tolkFeriefil(JSON.parse(await readFile(UTFIL, 'utf8').catch(() => 'null')));
    if (iRepoet && iRepoet.hentet >= reserve.hentet) {
      console.log(`Beholder ferielista i repoet (hentet ${iRepoet.hentet}).`);
      return true;
    }
    await skriv({ kilde: FERIEKILDE.url, ...reserve });
    console.log(`Bruker forrige publiserte ferieliste (hentet ${reserve.hentet}).`);
    return true;
  } catch (feil) {
    console.log(`Fant ingen tidligere publisert ferieliste: ${feil.message}`);
    return false;
  }
}

async function main() {
  const fil = argument('--fil');
  // Gamle ferier er ikke interessante; behold det siste halve året bakover.
  const grense = leggTilDager(iDag(), -183);
  const nyeNok = (ferier) => ferier.filter((f) => f.til >= grense);

  let side;
  try {
    side = fil
      ? { url: FERIEKILDE.url, status: 'lokal fil', type: fil, tekst: await readFile(fil, 'utf8') }
      : await hentSide(FERIEKILDE.url);
  } catch (feil) {
    advarsel(`Kunne ikke hente skoleruta fra ${FERIEKILDE.navn}: ${feil.message}`);
    await brukReserve();
    return;
  }

  let ferier = nyeNok(tolkSkolerute(side.tekst));
  let kilde = side.url;
  if (ferier.length === 0 && !fil) {
    const underside = await provUndersider(side);
    if (underside) {
      ferier = nyeNok(underside.ferier);
      kilde = underside.url;
    }
  }

  if (ferier.length === 0) {
    diagnose(side);
    advarsel(
      `Fant ingen ferier på ${FERIEKILDE.url}. Se «Diagnose av skolerute-siden» i loggen for hva siden inneholdt.`,
    );
    await brukReserve();
    return;
  }

  await skriv({ kilde: FERIEKILDE.url, hentet: iDag(), ferier });
  console.log(`Fant ${ferier.length} ferier hos ${FERIEKILDE.navn} (${kilde}):`);
  for (const f of ferier) console.log(`  ${f.navn.padEnd(12)} ${f.fra} – ${f.til}`);
}

await main();
