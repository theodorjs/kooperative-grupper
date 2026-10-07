#!/usr/bin/env node
// Henter skoleruta til Moss kommune, tolker feriene og skriver dem til
// public/ferier-moss.json. Kjøres av GitHub Actions før nettsiden bygges.
//
//   node scripts/hent-ferier.mjs                     henter fra kommunen
//   node scripts/hent-ferier.mjs --fil side.html     tolker en lagret side (for testing)
//   node scripts/hent-ferier.mjs --reserve <url>     bruker den publiserte fila hvis henting feiler
//
// Skriptet stopper aldri publiseringen: feiler alt, beholdes fila som den er,
// og det skrives en advarsel i loggen til GitHub Actions.

import { readFile, writeFile } from 'node:fs/promises';
import { FERIEKILDE, tolkFeriefil } from '../src/data/ferieimport.js';
import { tolkSkolerute } from '../src/logikk/skolerute.js';
import { iDag, leggTilDager } from '../src/logikk/uke.js';

const UTFIL = new URL(`../public/${FERIEKILDE.fil}`, import.meta.url);
const BRUKERAGENT =
  'Mozilla/5.0 (compatible; Kooperative-grupper/1.0; +https://github.com/theodorjs/Kooperative-Grupper)';

const argument = (navn) => {
  const i = process.argv.indexOf(navn);
  return i === -1 ? null : process.argv[i + 1];
};

const advarsel = (melding) => console.log(`::warning title=Ferieimport::${melding}`);

async function hentTekst(url) {
  const svar = await fetch(url, {
    headers: { 'User-Agent': BRUKERAGENT, Accept: 'text/html,application/json' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!svar.ok) throw new Error(`${url} svarte ${svar.status} ${svar.statusText}`);
  return svar.text();
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
  let ferier;
  try {
    const html = fil ? await readFile(fil, 'utf8') : await hentTekst(FERIEKILDE.url);
    // Gamle ferier er ikke interessante; behold det siste halve året bakover.
    const grense = leggTilDager(iDag(), -183);
    ferier = tolkSkolerute(html).filter((f) => f.til >= grense);
  } catch (feil) {
    advarsel(`Kunne ikke hente skoleruta fra ${FERIEKILDE.navn}: ${feil.message}`);
    await brukReserve();
    return;
  }

  if (ferier.length === 0) {
    advarsel(
      `Fant ingen ferier på ${FERIEKILDE.url}. Siden kan ha endret form, eller skoleruta ligger bare som PDF.`,
    );
    await brukReserve();
    return;
  }

  await skriv({ kilde: FERIEKILDE.url, hentet: iDag(), ferier });
  console.log(`Fant ${ferier.length} ferier hos ${FERIEKILDE.navn}:`);
  for (const f of ferier) console.log(`  ${f.navn.padEnd(12)} ${f.fra} – ${f.til}`);
}

await main();
