/**
 * Apakah `className="js"` pada <html> satu-satunya penyebab mismatch?
 *
 * Peringatan React menyertakan pohon komponen dengan penanda `+`/`-`. Bila hanya
 * ada satu, perbaikan bisa tepat sasaran. Di sini seluruh blok pesan dicetak
 * utuh (bukan dipotong) supaya tidak ada penanda lain yang terlewat.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const logs = [];
  page.on('console', (m) => {
    if (m.type() === 'error') logs.push(m.text());
  });

  await page.goto('http://127.0.0.1:3001/tentang', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(4000);

  // React menandai perbedaan dengan `+` (klien) dan `-` (server).
  for (const log of logs) {
    const diffLines = log
      .split('\n')
      .filter((l) => /^\s*[+-]\s+\S/.test(l) && !/^\s*[+-]\s*$/.test(l));
    if (diffLines.length) {
      console.log('--- diff lines in hydration warning ---');
      for (const d of diffLines) console.log(d);
    }
  }

  // Bukti langsung di DOM: apakah <html> punya kelas js saat React melihatnya?
  const htmlInfo = await page.evaluate(() => {
    const el = document.documentElement;
    return {
      className: el.className,
      classList: Array.from(el.classList),
      outerStart: el.outerHTML.slice(0, 120),
    };
  });
  console.log('\n--- <html> as it exists in the live DOM ---');
  console.log(JSON.stringify(htmlInfo, null, 2));

  await context.close();
  await browser.close();
})();
