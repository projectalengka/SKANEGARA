/**
 * Bandingkan HTML server mentah dengan DOM setelah hidrasi, elemen per elemen.
 *
 * Peringatan React muncul pada 973ms, SEBELUM `data-revealed` pernah ditulis.
 * Jadi atribut itu bukan pemicunya — ia hanya ikut terlihat saat React
 * melaporkan pohonnya. Yang perlu ditemukan: apa yang sebenarnya berbeda.
 *
 * Caranya: ambil HTML server lewat fetch langsung (tanpa JavaScript), lalu
 * bandingkan dengan DOM setelah hidrasi pada elemen yang sama.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const warnings = [];
  page.on('console', (m) => {
    if (/hydrated but some attributes/i.test(m.text())) warnings.push(m.text());
  });

  await page.goto('http://127.0.0.1:3001/tentang', { waitUntil: 'load', timeout: 60000 });

  // Sample the DOM immediately, before our reveal delay can have run, then again
  // once everything has settled. The difference tells us who moved.
  const early = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('[data-reveal], [data-image-reveal]'));
    return els.map((el) => ({
      tag: el.tagName.toLowerCase(),
      attrs: Array.from(el.attributes).map((a) => a.name).join(','),
      revealed: el.hasAttribute('data-revealed'),
      text: (el.textContent || '').trim().slice(0, 45),
    }));
  });

  await page.waitForTimeout(3500);

  const late = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('[data-reveal], [data-image-reveal]'));
    return els.map((el) => ({
      tag: el.tagName.toLowerCase(),
      attrs: Array.from(el.attributes).map((a) => a.name).join(','),
      revealed: el.hasAttribute('data-revealed'),
      text: (el.textContent || '').trim().slice(0, 45),
    }));
  });

  console.log(`warnings: ${warnings.length}\n`);
  console.log('EARLY (before reveals settle):');
  for (const e of early.slice(0, 8)) console.log(`  ${e.tag.padEnd(8)} revealed=${String(e.revealed).padEnd(5)} attrs=${e.attrs}  "${e.text}"`);
  console.log('\nLATE (after reveals settle):');
  for (const e of late.slice(0, 8)) console.log(`  ${e.tag.padEnd(8)} revealed=${String(e.revealed).padEnd(5)} attrs=${e.attrs}  "${e.text}"`);

  await context.close();
  await browser.close();
})();
