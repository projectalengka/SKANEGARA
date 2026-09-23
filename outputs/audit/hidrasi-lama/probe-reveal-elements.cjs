/**
 * Elemen mana persisnya, dan apakah React membandingkannya *sebelum* atau
 * *sesudah* kelas ditambahkan?
 *
 * Jejak sebelumnya menunjukkan penulisnya adalah RevealObserver pada ~942ms,
 * setelah `load` (912ms). Jadi hidrasi belum selesai saat itu di halaman ini.
 * Yang perlu diketahui sekarang: elemen apa, dan apakah ada jalan agar React
 * menyelesaikan hidrasi lebih dulu tanpa bergantung pada waktu.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.addInitScript(() => {
    const t0 = performance.now();
    const stamp = () => `${(performance.now() - t0).toFixed(0)}ms`;
    const original = DOMTokenList.prototype.add;
    window.__touched = [];
    DOMTokenList.prototype.add = function (...args) {
      if (args.includes('is-revealed')) {
        const el = this;
        const owner = el.ownerElement || el;
        const tag = owner.tagName ? owner.tagName.toLowerCase() : 'svg-attr';
        window.__touched.push({
          tag,
          time: stamp(),
          clsBefore: String(owner.className?.baseVal ?? owner.className ?? '').slice(0, 70),
          isSvg: owner.namespaceURI === 'http://www.w3.org/2000/svg',
          dataReveal: owner.hasAttribute?.('data-reveal') ?? false,
          dataImageReveal: owner.hasAttribute?.('data-image-reveal') ?? false,
        });
      }
      return original.apply(this, args);
    };
  });

  await page.goto('http://127.0.0.1:3001/tentang', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(4000);

  const touched = await page.evaluate(() => window.__touched);
  console.log(`total is-revealed additions: ${touched.length}`);
  for (const t of touched.slice(0, 12)) {
    console.log(
      `  ${t.time}  tag=${t.tag}  svg=${t.isSvg}  data-reveal=${t.dataReveal}  data-image-reveal=${t.dataImageReveal}  cls="${t.clsBefore}"`,
    );
  }

  // Which elements on the page carry data-reveal / data-image-reveal, and are
  // any of them SVG sub-elements rather than HTML elements?
  const targets = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('[data-reveal], [data-image-reveal]'));
    return els.slice(0, 20).map((el) => ({
      tag: el.tagName.toLowerCase(),
      svg: el.namespaceURI === 'http://www.w3.org/2000/svg',
      className: String(el.className?.baseVal ?? el.className ?? '').slice(0, 60),
      revealed: el.classList.contains('is-revealed'),
    }));
  });
  console.log('\nreveal targets on the page:');
  for (const t of targets) console.log(`  ${t.tag.padEnd(8)} svg=${String(t.svg).padEnd(5)} revealed=${String(t.revealed).padEnd(5)} ${t.className}`);

  await context.close();
  await browser.close();
})();
