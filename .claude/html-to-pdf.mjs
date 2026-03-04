import puppeteer from '/usr/local/lib/node_modules/@mermaid-js/mermaid-cli/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, 'cost-estimation.html');
const pdfPath = path.join(__dirname, '94Cram_成本預估表_100校_大型校.pdf');

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });
await page.pdf({
  path: pdfPath,
  format: 'A4',
  printBackground: true,
  margin: { top: '10mm', bottom: '10mm', left: '8mm', right: '8mm' },
});
await browser.close();
console.log(`PDF generated: ${pdfPath}`);
