/**
 * Baca langsung dari browser: nilai setiap --step-N setelah clamp, dan nilai
 * suku pilihannya sebelum clamp.
 *
 * PERAN BERKAS INI SEKARANG: PERINGATAN, BUKAN DIAGNOSIS
 * ------------------------------------------------------
 * Versi pertama berkas ini dipakai untuk membongkar bug satuan: --step-8
 * dirender 47px di 1440px padahal seharusnya 104px. Waktu itu ia mencetak blok
 * "nilai yang seharusnya" dan "dihitung manual" yang memakai koefisien SALAH
 * (0.3425vw) dan bahkan menyebutnya "benar secara aritmetika". Blok itu
 * sekarang dihapus: kalau dibiarkan, pembaca berikutnya akan mempercayainya.
 *
 * Yang tersisa hanya pengukuran. Prinsipnya: untuk memutuskan pertentangan
 * antara aritmetika dan browser, JANGAN berdebat dengan aljabar — tanyakan
 * browsernya. Dan jangan pernah menuliskan ulang rumus di sini; itulah cara
 * kesalahan satuan yang sama bisa lolos dua kali.
 *
 * Nilai yang diharapkan, dari tokens.css (jangkar 400px / 1440px):
 *   --step-7: 41 → 80px     --step-8: 47 → 104px
 * Kalau pada 1440px hasilnya masih di dekat lantai, koefisien vw-nya salah.
 */

const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.argv[2] || 'http://127.0.0.1:3000';

/* Harapan, ditulis sebagai data supaya bisa diperiksa — bukan dihitung. */
const EXPECTED = {
  400: { '--step-7': 41, '--step-8': 47 },
  1440: { '--step-7': 80, '--step-8': 104 },
};

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  let failed = 0;

  for (const width of [400, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 800 } });
    await page.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 });

    const r = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.position = 'absolute';
      probe.style.visibility = 'hidden';
      document.body.appendChild(probe);

      const used = {};
      for (const n of ['--step--2', '--step-1', '--step-0', '--step-1', '--step-2',
                       '--step-3', '--step-4', '--step-5', '--step-6', '--step-7', '--step-8']) {
        probe.style.fontSize = `var(${n})`;
        used[n] = parseFloat(getComputedStyle(probe).fontSize);
      }
      probe.remove();

      /* Custom property mentah, untuk melihat koefisien yang benar-benar dikirim. */
      const raw = {};
      const cs = getComputedStyle(document.documentElement);
      for (const n of ['--step-7', '--step-8']) raw[n] = cs.getPropertyValue(n).trim();

      /* 1vw yang sebenarnya, sebagai referensi satuan. */
      const vwProbe = document.createElement('div');
      vwProbe.style.cssText = 'position:absolute;visibility:hidden;width:1vw;height:0';
      document.body.appendChild(vwProbe);
      const oneVw = vwProbe.getBoundingClientRect().width;
      vwProbe.remove();

      return { used, raw, oneVw, vw: window.innerWidth };
    });

    console.log(`\n=== viewport ${r.vw}px   (1vw = ${r.oneVw.toFixed(3)}px) ===`);
    for (const n of ['--step-5', '--step-6', '--step-7', '--step-8']) {
      console.log(`  ${n} = ${r.used[n].toFixed(3)}px`);
    }
    console.log('  koefisien yang dikirim:');
    for (const [k, v] of Object.entries(r.raw)) console.log(`    ${k}: ${v}`);

    console.log('  harapan:');
    for (const [n, want] of Object.entries(EXPECTED[width])) {
      const got = r.used[n];
      const ok = Math.abs(got - want) < 0.5;
      if (!ok) failed++;
      console.log(
        `    ${ok ? 'ok   ' : 'GAGAL'} ${n} = ${got.toFixed(1)}px (harus ${want}px)` +
          (ok ? '' : '  → koefisien vw menempel di ujung yang salah'),
      );
    }

    await page.close();
  }

  console.log(
    failed
      ? `\n  → ${failed} nilai meleset: skala TIDAK fluid. Periksa koefisien vw di tokens.css.`
      : '\n  → semua nilai tepat: skala benar-benar fluid antara 400px dan 1440px.',
  );
  await browser.close();
  if (failed) process.exit(1);
})();
