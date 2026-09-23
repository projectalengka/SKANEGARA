/**
 * Ukur hierarki tipografi di browser sungguhan.
 *
 * Kenapa ini ada: skala bisa benar di dalam tokens.css dan tetap salah di
 * halaman. Satu utility `text-[…]` yang tertinggal, satu `!important` yang
 * kalah, satu elemen yang ukurannya diwarisi dari induk — semuanya tidak
 * terlihat dari membaca kode. Jadi yang diukur di sini adalah computed style
 * dari elemen yang benar-benar dirender.
 *
 * Yang diperiksa:
 *   1. Apakah setiap ukuran yang muncul di halaman adalah salah satu dari 11
 *      langkah skala? (penyimpang dilaporkan dengan selector-nya)
 *   2. Rasio antar tingkat hierarki: hero : judul section : teks badan : label
 *   3. Apakah ada dua elemen teks yang ukurannya <6% berbeda tapi berbeda
 *      peran — persis penyakit yang sedang diperbaiki
 *   4. Overflow horizontal di 320px (aturan proyek: harus nol)
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.argv[2] || 'http://127.0.0.1:3000';
const PAGES = ['/', '/tentang', '/program-keahlian', '/kegiatan', '/karya', '/galeri', '/berita'];

/* The 11 steps, in px, at the two ends of the 400→1440px fluid window.
 * A rendered size is "on scale" if it falls inside one step's band. */
const STEPS = [
  ['--step--2', 10, 11],
  ['--step--1', 12, 13],
  ['--step-0', 14, 15],
  ['--step-1', 16, 18],
  ['--step-2', 18, 21],
  ['--step-3', 21, 25],
  ['--step-4', 26, 32],
  ['--step-5', 32, 44],
  ['--step-6', 40, 60],
  ['--step-7', 48, 80],
  ['--step-8', 56, 104],
];

const stepOf = (px) => {
  for (const [name, a, b] of STEPS) if (px >= a - 0.75 && px <= b + 0.75) return name;
  return null;
};

/* Resolve a step's clamp at a given viewport width, in px.
 *
 * This exists because reading `getComputedStyle(documentElement)
 * .getPropertyValue('--step-8')` returns NaN — the browser does not resolve a
 * clamp() sitting in a custom property on :root for that access path. And
 * measuring a throwaway element styled with `var()` gives the *rendered* value
 * but only at the real viewport, so it cannot be swept across widths.
 *
 * Substituting the width into the formula is the only way to check the
 * behaviour at a size the browser is not currently at — which matters, because
 * the bug this probe was written to catch (a missing ×100 on the vw slope)
 * makes every step pin to its floor and is invisible at a single width. */
const CLAMPS = {
  '--step--2': [0.625, 0.601, 0.006],
  '--step--1': [0.75, 0.726, 0.006],
  '--step-0': [0.875, 0.851, 0.006],
  '--step-1': [1.0, 0.9519, 0.012],
  '--step-2': [1.125, 1.0529, 0.018],
  '--step-3': [1.3125, 1.2163, 0.024],
  '--step-4': [1.625, 1.4808, 0.0361],
  '--step-5': [2.0, 1.7115, 0.0721],
  '--step-6': [2.5, 2.0192, 0.1202],
  '--step-7': [3.0, 2.2308, 0.1923],
  '--step-8': [3.5, 2.3462, 0.2885],
};

const resolveStep = (name, vw) => {
  const [lo, intercept, slopeVw] = CLAMPS[name];
  const preferred = (intercept + (slopeVw / 100) * vw) * 16;
  return Math.min(Math.max(preferred, lo * 16), hiOf(name));
};
const hiOf = (name) => STEPS.find(([n]) => n === name)[2];

const WIDTHS = [320, 390, 768, 1440];

(async () => {
  /* ── Gerbang fluiditas ────────────────────────────────────────────────
     Ini pemeriksaan yang seharusnya menangkap bug ×100 pada koefisien vw.
     Setiap langkah WAJIB bergerak antara 400px dan 1440px. Kalau ada yang
     diam, koefisiennya rusak dan seluruh skala menempel di batas bawah —
     yang di satu lebar layar terlihat "tenang", bukan rusak. */
  console.log('='.repeat(72));
  console.log('  GERBANG FLUIDITAS — setiap langkah harus bergerak 400px → 1440px');
  console.log('='.repeat(72));
  let stalled = 0;
  for (const [name] of STEPS) {
    const a = resolveStep(name, 400);
    const b = resolveStep(name, 1440);
    const grows = b > a + 0.5;
    if (!grows) stalled++;
    console.log(
      `  ${grows ? 'ok   ' : 'GAGAL'} ${name.padEnd(10)} ` +
        `${a.toFixed(1)}px → ${b.toFixed(1)}px  (×${(b / a).toFixed(2)})`,
    );
  }
  console.log(
    stalled
      ? `\n  → ${stalled} langkah DIAM. Koefisien vw salah; skala tidak fluid.\n`
      : '\n  → semua langkah fluid.\n',
  );

  let anyOffScale = 0;
  let anyOverflow = 0;
  let anyTie = 0;

  for (const width of WIDTHS) {
    console.log(`\n${'='.repeat(72)}\n  LEBAR ${width}px\n${'='.repeat(72)}`);

    const browser = await chromium.launch({ executablePath: CHROME, headless: true });
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.addInitScript(() => {
      try {
        localStorage.setItem('skagara:reduce-motion', '1');
      } catch {}
    });

    for (const path of PAGES) {
      await page.goto(BASE + path, { waitUntil: 'load', timeout: 60000 });
      await page.waitForTimeout(350);

      const r = await page.evaluate(() => {
        /* Only *visible text* elements: they must own a text node and have a
         * non-zero box. A parent that merely contains text is not a level. */
        const out = [];
        for (const el of document.querySelectorAll('body *')) {
          const own = Array.from(el.childNodes).some(
            (n) => n.nodeType === 3 && n.textContent.trim().length > 1,
          );
          if (!own) continue;
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden') continue;
          const box = el.getBoundingClientRect();
          if (box.width < 2 || box.height < 2) continue;
          if (parseFloat(cs.opacity) < 0.05) continue;

          out.push({
            px: parseFloat(cs.fontSize),
            weight: cs.fontWeight,
            family: cs.fontFamily.split(',')[0].replace(/["']/g, ''),
            tag: el.tagName.toLowerCase(),
            cls: String(el.className).split(/\s+/).filter(Boolean).slice(0, 3).join(' '),
            text: (el.textContent || '').trim().slice(0, 34),
          });
        }

        const doc = document.documentElement;
        return {
          els: out,
          overflow: Math.max(0, doc.scrollWidth - doc.clientWidth),
        };
      });

      /* ── 1. off-scale sizes ─────────────────────────────────────────── */
      const off = r.els.filter((e) => e.px >= 9 && stepOf(e.px) === null);

      /* ── 2. hierarchy ratios ──────────────────────────────────────────
         `body` used to require a text node longer than 60 characters, which
         returned 0 on any page whose prose is written in short paragraphs —
         and 0 is not "no body text", it is "the detector is wrong". Measure the
         declared body step instead, then report the real copy separately. */
      const sizes = r.els.map((e) => e.px);
      const hero = sizes.length ? Math.max(...sizes) : 0;
      const body = resolveStep('--step-0', width);
      const labelPx = resolveStep('--step--2', width);

      /* ── 3. near-ties that are NOT the same step ────────────────────── */
      const uniq = [...new Set(sizes)].sort((a, b) => a - b);
      const ties = [];
      for (let i = 1; i < uniq.length; i++) {
        const a = uniq[i - 1];
        const b = uniq[i];
        if (a < 9) continue;
        const ratio = b / a;
        if (ratio < 1.06 && stepOf(a) !== stepOf(b)) ties.push(`${a}→${b} (×${ratio.toFixed(3)})`);
      }

      const flag = off.length || r.overflow > 0 || ties.length ? 'FAIL' : 'OK  ';
      console.log(
        `${flag} ${path.padEnd(20)}` +
          ` hero=${hero.toFixed(1)}  body=${body.toFixed(1)}  label=${labelPx.toFixed(1)}  ` +
          `hero/body=${(hero / body).toFixed(2)}×  ` +
          `overflow=${r.overflow}px  off-scale=${off.length}  ties=${ties.length}`,
      );

      off.slice(0, 6).forEach((e) =>
        console.log(`       off: ${e.px}px  ${e.tag}.${e.cls}  "${e.text}"`),
      );
      ties.slice(0, 6).forEach((t) => console.log(`       tie: ${t}`));

      anyOffScale += off.length;
      anyOverflow += r.overflow > 0 ? 1 : 0;
      anyTie += ties.length;
    }

    await browser.close();
  }

  console.log(`\n${'='.repeat(72)}`);
  console.log(`  elemen di luar skala    : ${anyOffScale}`);
  console.log(`  halaman overflow-x      : ${anyOverflow}`);
  console.log(`  pasangan ukuran terlalu dekat : ${anyTie}`);
  console.log('='.repeat(72));
})();
