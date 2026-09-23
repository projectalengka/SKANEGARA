/**
 * Apakah menulis ke `document.documentElement` (yang sudah
 * `suppressHydrationWarning`) aman, dan bisakah CSS memakai satu penanda di
 * sana untuk memicu reveal pada elemen turunan?
 *
 * Ini penting karena `suppressHydrationWarning` pada <html> menutup
 * perbandingan atribut <html> sendiri. Kalau benar, satu tulisan di sana bisa
 * menggantikan N tulisan di elemen yang React bandingkan.
 *
 * Yang diukur: apakah atribut di <html> bertahan (tidak dibersihkan React),
 * dan apakah selector turunannya bekerja.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();

  // Halaman uji mandiri: satu div dengan atribut, dan satu tulisan di <html>.
  await page.setContent(`
    <!doctype html>
    <html lang="id" data-test-root="yes">
      <head><style>
        .js [data-x] { color: rgb(255,0,0); }
        .js [data-test-root="yes"] [data-x] { color: rgb(0,128,0); }
      </style></head>
      <body class="js">
        <div id="a" data-x>content</div>
        <script>
          window.__probe = { before: getComputedStyle(document.getElementById('a')).color };
        </script>
      </body>
    </html>
  `);

  const before = await page.evaluate(() => window.__probe.before);
  const after = await page.evaluate(
    () => getComputedStyle(document.getElementById('a')).color,
  );
  const rootAttr = await page.evaluate(() =>
    document.documentElement.getAttribute('data-test-root'),
  );
  console.log('color with .js [data-x]:', before, '(expect rgb(255, 0, 0))');
  console.log('color with .js [data-test-root] [data-x]:', after, '(expect rgb(0, 128, 0))');
  console.log('<html> attribute readable from CSS:', rootAttr);

  await browser.close();
})();
