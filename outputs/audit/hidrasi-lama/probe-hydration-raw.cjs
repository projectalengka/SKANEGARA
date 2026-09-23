/**
 * Cetak peringatan hidrasi MENTAH, apa adanya.
 *
 * Ekstraktor berbasis regex saya sudah tiga kali menyimpulkan hal yang berbeda
 * karena React mengubah format keluaran antar-render. Daripada menebak lagi,
 * seluruh teks pesan dicetak dan disimpan ke berkas untuk dibaca langsung.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');
const fs = require('node:fs');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const warnings = [];
  page.on('console', (m) => {
    const t = m.text();
    if (/hydrated but some attributes/i.test(t)) warnings.push(t);
  });

  await page.goto('http://127.0.0.1:3001/tentang', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(4000);

  console.log(`warnings captured: ${warnings.length}\n`);
  if (warnings.length) {
    fs.writeFileSync('outputs/audit/hydration-raw.txt', warnings.join('\n\n=====\n\n'), 'utf8');
    // Print the component tree portion only: everything after the boilerplate.
    const w = warnings[0];
    const idx = w.indexOf('  ...');
    console.log(w.slice(idx).slice(0, 4000));
  }

  await context.close();
  await browser.close();
})();
