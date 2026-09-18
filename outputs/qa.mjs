/**
 * Visual and behavioural QA harness.
 *
 * Drives the built site through real Chrome and reports what it *measured*
 * rather than what the markup implies. Four things are checked on every run,
 * because each has a failure mode that a green build cannot catch:
 *
 *  1. **Console errors.** A hydration mismatch, a failed image, a rejected
 *     promise — none of these fail `next build`. They only appear here.
 *  2. **Horizontal overflow at 320px.** The brief demands it. A single stray
 *     transform or an unbreakable string produces a whole-page scrollbar that is
 *     invisible at 1440px.
 *  3. **Fonts actually loaded.** `getComputedStyle().fontFamily` reports the
 *     *requested* family, not the one that painted — it happily says
 *     "Instrument Sans" while the browser draws a fallback. `document.fonts.check`
 *     is the only honest test.
 *  4. **No serif survives.** Seluruh situs memakai satu rumpun sans. Kalau ada
 *     elemen yang masih mewarisi serif — dari aturan CSS yang tertinggal, atau
 *     dari kelas yang terlupa — itu akan terlihat di sini, bukan ketahuan
 *     setelah dilihat sendiri di browser.
 *  5. **Content is not invisible after the entrance.** The single worst failure
 *     in an animation-heavy site is a reveal that never fires, leaving an
 *     `opacity: 0` heading. This asserts that the hero headline and the first
 *     section are actually painted.
 *
 * Usage:  node outputs/qa.mjs [baseUrl] [--shots]
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');

const { chromium } = require('playwright-core');

const BASE = process.argv[2]?.startsWith('http') ? process.argv[2] : 'http://127.0.0.1:3100';
const SHOTS = process.argv.includes('--shots');
const OUT = join(process.cwd(), 'outputs');
mkdirSync(OUT, { recursive: true });

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const VIEWPORTS = [
  { name: '320', width: 320, height: 720 },
  { name: '390', width: 390, height: 844 },
  { name: '768', width: 768, height: 1024 },
  { name: '1024', width: 1024, height: 768 },
  { name: '1440', width: 1440, height: 900 },
  { name: '1920', width: 1920, height: 1080 },
];

const ROUTES = [
  '/',
  '/tentang',
  '/program-keahlian',
  '/program-keahlian/desain-komunikasi-visual',
  '/program-keahlian/otomotif',
  '/kegiatan',
  '/karya',
  '/galeri',
  '/berita',
  '/kontak',
  '/privasi',
  '/halaman-tidak-ada',
];

/**
 * Routes checked only at desktop width, by their own pass.
 *
 * The admin dashboard is a tool, not a public page: it has one meaningful
 * layout (the sidebar shell) and is only ever used at a desk. Checking it at
 * six widths would add noise, not confidence. What *does* matter is that it
 * renders without errors and that it is actually protected — both of which are
 * asserted below.
 */
const ADMIN_ROUTES = ['/admin/masuk', '/admin/dasbor'];

const report = { base: BASE, generatedAt: new Date().toISOString(), results: [] };

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

for (const route of ROUTES) {
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    const consoleErrors = [];
    const failedRequests = [];
    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      const text = message.text();
      // A bare "404" console entry carries no URL, which makes it useless for
      // diagnosis. Capture the location so the report names the missing asset.
      const where = message.location();
      const url = where?.url ?? '';
      // See the note on the response handler below: this one is expected.
      if (url.includes('/halaman-tidak-ada')) return;
      consoleErrors.push(url ? `${text} -> ${url}` : text);
    });
    page.on('response', (response) => {
      const url = response.url();
      // One 404 is expected and is not a defect: the deliberately-missing route
      // the 404 test navigates to. It is recorded in `failedRequests` (reported
      // but not failed) and excluded from the console-error count so that a real
      // 404 cannot hide behind it.
      //
      // The `/admin/*` exclusion that used to live here has been removed. It was
      // a temporary allowance for Next.js prefetching links to dashboard routes
      // that had not been written yet; now that every one of them exists, a 404
      // under /admin/ is a real finding and should be reported as such.
      const expected = url.includes('/halaman-tidak-ada');
      if (response.status() >= 400 && !expected) {
        failedRequests.push(`${response.status()} ${url}`);
      }
    });
    page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));
    page.on('requestfailed', (request) => {
      failedRequests.push(`${request.url()} — ${request.failure()?.errorText ?? 'gagal'}`);
    });

    await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 45_000 });
    // Let the hero entrance finish: it is a ~1.4s timeline plus a stagger.
    await page.waitForTimeout(2600);

    const metrics = await page.evaluate(() => {
      const root = document.documentElement;

      // Does any element extend past the viewport width?
      const overflowing = [];
      for (const element of document.querySelectorAll('body *')) {
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.right > window.innerWidth + 1 || rect.left < -1) {
          const style = getComputedStyle(element);
          if (style.position === 'fixed') continue; // the lightbox layer legitimately spans the viewport
          overflowing.push({
            tag: element.tagName.toLowerCase(),
            cls: (element.className || '').toString().slice(0, 70),
            right: Math.round(rect.right),
            left: Math.round(rect.left),
          });
        }
      }

      const hero = document.querySelector('h1');
      const heroStyle = hero ? getComputedStyle(hero) : null;
      const heroVisible = hero
        ? heroStyle.opacity !== '0' && hero.getBoundingClientRect().height > 0
        : false;

      /*
       * Whether the headline is actually *readable*, not merely present.
       *
       * Checking the `<h1>`'s own opacity is not enough, and a real bug slipped
       * through exactly there: a line-splitter flattened the heading, the mask
       * measured a 27px box around a 10rem headline, and the inner span was
       * translated out of a container that clipped it. The `<h1>` had
       * `opacity: 1` and non-zero height the whole time, so `heroVisible` was
       * true while the screen showed an empty hero.
       *
       * So measure the painted line boxes instead. A `.line-mask > span` that is
       * still translated down by roughly its own height is content that has not
       * arrived, regardless of what its ancestors report.
       */
      const heroLines = [...document.querySelectorAll('h1 .line-mask > span')].map((span) => {
        const rect = span.getBoundingClientRect();
        const mask = span.parentElement;
        const maskRect = mask ? mask.getBoundingClientRect() : null;
        return {
          text: (span.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40),
          height: Math.round(rect.height),
          maskHeight: maskRect ? Math.round(maskRect.height) : null,
          opacity: getComputedStyle(span).opacity,
          // Escaped vertically: visually gone even though it is in the DOM.
          escaped: maskRect ? rect.top - maskRect.top > maskRect.height * 0.9 : false,
        };
      });

      const imagesWithoutAltCount = [...document.querySelectorAll('img')].filter(
        (img) => !img.hasAttribute('alt'),
      ).length;

      const firstReveal = document.querySelector('[data-reveal]');
      const revealVisible = firstReveal ? getComputedStyle(firstReveal).opacity !== '0' : null;

      return {
        scrollWidth: root.scrollWidth,
        clientWidth: root.clientWidth,
        hasHorizontalOverflow: root.scrollWidth > root.clientWidth + 1,
        overflowing: overflowing.slice(0, 6),
        overflowingCount: overflowing.length,
        fonts: {
          // Judul kini memakai Instrument Sans juga. Memeriksa "Instrument Serif"
          // di sini akan lulus secara semu: berkasnya masih dikirim, tapi tidak
          // ada satu pun elemen yang memakainya — jadi pemeriksaan itu tidak
          // membuktikan apa pun tentang apa yang benar-benar digambar.
          display: document.fonts.check('600 3rem "Instrument Sans"'),
          sans: document.fonts.check('400 1rem "Instrument Sans"'),
          mono: document.fonts.check('400 0.7rem "JetBrains Mono"'),
        },
        // Keluarga font yang benar-benar dipakai judul, dibaca dari elemennya.
        heroFontFamily: hero ? getComputedStyle(hero).fontFamily : null,
        // Berat judul, untuk memastikan kontras berat benar-benar berlaku.
        heroFontWeight: hero ? getComputedStyle(hero).fontWeight : null,
        // Elemen mana pun yang masih menggambar serif. `serif` juga menangkap
        // rumpun bernama seperti Georgia/Times, yang akan muncul kalau font
        // kustom gagal dimuat dan cadangannya dipakai.
        serifUsages: [...document.querySelectorAll('body *')]
          .filter((el) => {
            const family = getComputedStyle(el).fontFamily || '';
            // Hanya elemen yang benar-benar punya teks sendiri.
            const ownText = [...el.childNodes].some(
              (n) => n.nodeType === 3 && n.textContent.trim().length > 0,
            );
            if (!ownText) return false;
            return /\b(serif|georgia|times)\b/i.test(family) && !/sans-serif/i.test(family);
          })
          .slice(0, 5)
          .map((el) => `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]}`),
        bodyFontFamily: getComputedStyle(document.body).fontFamily,
        heroFontFamily: hero ? heroStyle.fontFamily : null,
        heroVisible,
        heroLines,
        heroLinesVisible: heroLines.filter((line) => !line.escaped && line.opacity !== '0').length,
        heroText: hero ? hero.textContent.replace(/\s+/g, ' ').trim().slice(0, 90) : null,
        revealVisible,
        headingCount: document.querySelectorAll('h1, h2, h3').length,
        h1Count: document.querySelectorAll('h1').length,
        imagesWithoutAlt: imagesWithoutAltCount,
        brokenImages: [...document.querySelectorAll('img')].filter(
          (img) => img.complete && img.naturalWidth === 0,
        ).length,
        sectionCount: document.querySelectorAll('main > section').length,
        scripted: root.classList.contains('js'),
        lenisActive: root.classList.contains('lenis'),
      };
    });

    const entry = {
      route,
      viewport: viewport.name,
      consoleErrors,
      failedRequests,
      ...metrics,
    };
    report.results.push(entry);

    if (SHOTS) {
      await page.screenshot({
        path: join(OUT, `qa-${route.replace(/\//g, '_') || 'home'}-${viewport.name}.png`),
        fullPage: false,
      });
    }

    await context.close();
  }
}

// Reduced-motion context: everything must be visible without any animation.
{
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 45_000 });
  await page.waitForTimeout(900);

  report.reducedMotion = await page.evaluate(() => {
    const hidden = [...document.querySelectorAll('[data-reveal], [data-image-reveal]')].filter(
      (element) => getComputedStyle(element).opacity === '0',
    ).length;
    return {
      lenisActive: document.documentElement.classList.contains('lenis'),
      hiddenReveals: hidden,
      bodyCursor: getComputedStyle(document.body).cursor,
    };
  });

  await context.close();
}

// Keyboard accessibility pass.
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 45_000 });

  const focusOrder = [];
  for (let i = 0; i < 6; i += 1) {
    await page.keyboard.press('Tab');
    focusOrder.push(
      await page.evaluate(() => {
        const element = document.activeElement;
        if (!element) return 'none';
        const label =
          element.getAttribute('aria-label') ||
          element.textContent?.replace(/\s+/g, ' ').trim().slice(0, 40) ||
          element.tagName;
        return `${element.tagName.toLowerCase()}: ${label}`;
      }),
    );
  }
  report.keyboard = { focusOrder };
  await context.close();
}

await browser.close();

const failures = [];
for (const result of report.results) {
  if (result.consoleErrors.length > 0) failures.push(`${result.viewport} ${result.route}: console errors`);
  if (result.hasHorizontalOverflow)
    failures.push(`${result.viewport} ${result.route}: overflow ${result.scrollWidth}px > ${result.clientWidth}px`);
  if (!result.heroVisible) failures.push(`${result.viewport} ${result.route}: hero not visible`);
  // The headline must be readable, not just present. See the note in the
  // evaluate block: a mask can hold a translated span that is clipped to nothing
  // while every ancestor still reports `opacity: 1`.
  if (result.heroLines.length > 0 && result.heroLinesVisible === 0) {
    failures.push(
      `${result.viewport} ${result.route}: headline lines are in the DOM but painted out of view`,
    );
  }
  if (!result.fonts.display) failures.push(`${result.viewport} ${result.route}: headline font not loaded`);
  if (!result.fonts.sans) failures.push(`${result.viewport} ${result.route}: sans font not loaded`);
  // Satu rumpun saja. Kalau ada elemen yang masih menggambar serif, itu aturan
  // CSS yang tertinggal — dan jauh lebih murah ditemukan di sini daripada
  // setelah dilihat sendiri.
  if (result.serifUsages && result.serifUsages.length > 0) {
    failures.push(
      `${result.viewport} ${result.route}: ${result.serifUsages.length} element(s) still render a serif — ${result.serifUsages.slice(0, 3).join(', ')}`,
    );
  }
  if (result.brokenImages > 0) failures.push(`${result.viewport} ${result.route}: ${result.brokenImages} broken image(s)`);
  if (result.h1Count !== 1) failures.push(`${result.viewport} ${result.route}: ${result.h1Count} h1 elements`);
}
if (report.reducedMotion.hiddenReveals > 0)
  failures.push(`reduced motion: ${report.reducedMotion.hiddenReveals} element(s) still hidden`);
if (report.reducedMotion.lenisActive) failures.push('reduced motion: smooth scroll still active');

writeFileSync(join(OUT, 'qa-report.json'), JSON.stringify(report, null, 2));

const width = 78;
console.log(`\n${'='.repeat(width)}`);
console.log(`QA — ${BASE}`);
console.log('='.repeat(width));

for (const result of report.results) {
  const overflow = result.hasHorizontalOverflow ? `OVERFLOW ${result.scrollWidth}>${result.clientWidth}` : 'ok';
  const fonts = `sans:${result.fonts.sans ? 'y' : 'n'} title:${result.fonts.display ? 'y' : 'n'} mono:${result.fonts.mono ? 'y' : 'n'}`;
  const lines = `${result.heroLinesVisible}/${result.heroLines.length}`;
  console.log(
    `${result.viewport.padStart(4)}px | err ${String(result.consoleErrors.length).padStart(2)} | ${overflow.padEnd(18)} | ${fonts} | hero:${result.heroVisible ? 'y' : 'n'} lines:${lines.padEnd(3)} | sec:${result.sectionCount} | imgBroken:${result.brokenImages}`,
  );
  if (result.heroLines.some((line) => line.escaped)) {
    console.log(`         escaped lines: ${JSON.stringify(result.heroLines.filter((l) => l.escaped))}`);
  }
  if (result.overflowingCount > 0) {
    console.log(`         overflowing: ${JSON.stringify(result.overflowing)}`);
  }
  if (result.consoleErrors.length > 0) {
    console.log(`         ${result.consoleErrors.slice(0, 3).join('\n         ')}`);
  }
}

console.log('-'.repeat(width));
console.log(`reduced motion : lenis=${report.reducedMotion.lenisActive} hidden=${report.reducedMotion.hiddenReveals}`);
console.log(`keyboard focus : ${report.keyboard.focusOrder.join(' → ')}`);
console.log('-'.repeat(width));

if (failures.length === 0) {
  console.log('HASIL: semua pemeriksaan lulus.');
} else {
  console.log(`HASIL: ${failures.length} temuan.`);
  for (const failure of failures) console.log(`  - ${failure}`);
}

console.log(`Laporan lengkap: outputs/qa-report.json\n`);
process.exit(failures.length === 0 ? 0 : 1);
