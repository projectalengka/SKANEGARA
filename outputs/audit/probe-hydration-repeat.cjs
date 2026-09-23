/**
 * Uji reliabilitas: halaman yang dulu gagal diulang berkali-kali.
 *
 * Versi sebelumnya LULUS kadang-kadang (galeri gagal 3/3, kegiatan 1/3), jadi
 * "lulus sekali" tidak membuktikan apa pun. Probe ini mengulang halaman rawan
 * sepuluh kali dan melaporkan jumlah kegagalan.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:3001';
const PAGES = ['/kegiatan', '/galeri', '/karya', '/berita'];
const RUNS = Number(process.argv[2] || 6);

(async () => {
  const fails = {};
  let total = 0;
  for (let i = 0; i < RUNS; i++) {
    for (const path of PAGES) {
      const browser = await chromium.launch({ executablePath: CHROME, headless: true });
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      let w = 0;
      page.on('console', (m) => {
        if (/hydrated but some attributes/i.test(m.text())) w++;
      });
      await page.goto(BASE + path, { waitUntil: 'load', timeout: 60000 });
      await page.waitForTimeout(2500);
      const revealed = await page.evaluate(
        () => document.querySelectorAll('[data-revealed]').length,
      );
      if (w > 0 || revealed === 0) {
        fails[path] = (fails[path] || 0) + 1;
      }
      total++;
      await browser.close();
    }
    process.stdout.write(`run ${i + 1}/${RUNS} done\r`);
  }
  console.log('\n--- results ---');
  for (const path of PAGES) {
    console.log(`${path.padEnd(12)} failures: ${fails[path] || 0}/${RUNS}`);
  }
  console.log(`total loads: ${total}, total failures: ${Object.values(fails).reduce((a, b) => a + b, 0)}`);
})();
