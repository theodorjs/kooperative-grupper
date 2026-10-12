// Lager guiden som PDF fra guide.html. Kjør fra rotmappa: node docs/guide/kilde/lag-pdf.mjs
// Krever Playwright med Chromium: npm install --no-save playwright && npx playwright install chromium
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

const html = fileURLToPath(new URL('./guide.html', import.meta.url));
const pdf = fileURLToPath(new URL('../Klassekart-en-kort-guide.pdf', import.meta.url));

const nettleser = await chromium.launch();
const side = await nettleser.newPage();
await side.goto(`file://${html}`, { waitUntil: 'networkidle' });
await side.pdf({ path: pdf, format: 'A4', printBackground: true, preferCSSPageSize: true });
await nettleser.close();
console.log(`Lagret ${pdf}`);
