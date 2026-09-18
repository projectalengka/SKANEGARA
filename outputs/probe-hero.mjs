/**
 * The hero headline must actually be painted on screen.
 *
 * This exists because the QA harness once reported the hero as fine while the
 * headline was invisible: every signal it read — opacity, element presence,
 * box height — was correct, and the tween reported success. It had simply never
 * moved the text out from under its clipping mask.
 *
 * So this measures the only thing that cannot lie: the rendered position of the
 * line relative to the box that clips it, sampled across the whole entrance.
 *
 *   node outputs/probe-hero.mjs
 *
 * Exit code is non-zero on failure, so it can gate a build.
 */
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = require('playwright-core');

const URL_UNDER_TEST = process.env.HERO_URL ?? 'http://127.0.0.1:3100/';
const VIEWPORTS = [
  { width: 320, height: 720 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});

let failures = 0;

for (const viewport of VIEWPORTS) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  // Sample the line's offset inside its mask from the first frame onward.
  await page.addInitScript(() => {
    window.__hero = [];
    const tick = () => {
      const spans = [...document.querySelectorAll('h1 .line-mask > span')];
      if (spans.length > 0 && window.__hero.length < 400) {
        window.__hero.push({
          t: Math.round(performance.now()),
          offsets: spans.map((span) => {
            const r = span.getBoundingClientRect();
            const m = span.parentElement?.getBoundingClientRect();
            return m ? Math.round((r.top - m.top) * 100) / 100 : null;
          }),
        });
      }
      if (performance.now() < 5000) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  await page.goto(URL_UNDER_TEST, { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(5200);

  const result = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    const spans = [...document.querySelectorAll('h1 .line-mask > span')];
    const samples = window.__hero;
    return {
      h1Height: h1 ? Math.round(h1.getBoundingClientRect().height) : 0,
      lineCount: spans.length,
      lines: spans.map((span) => {
        const r = span.getBoundingClientRect();
        const m = span.parentElement?.getBoundingClientRect();
        const cs = getComputedStyle(span);
        return {
          text: (span.textContent ?? '').trim().slice(0, 28),
          height: Math.round(r.height),
          maskHeight: m ? Math.round(m.height) : null,
          // How far the text sits below the top of the box that clips it.
          offsetInMask: m ? Math.round((r.top - m.top) * 100) / 100 : null,
          // Non-zero means the line is still translated out of view.
          escaped: m ? r.top - m.top > m.height * 0.9 : false,
          opacity: cs.opacity,
        };
      }),
      startOffset: samples.length > 0 ? samples[0].offsets : null,
      endOffset: samples.length > 0 ? samples[samples.length - 1].offsets : null,
    };
  });

  const label = `${viewport.width}px`;
  const problems = [];

  if (result.lineCount === 0) problems.push('no .line-mask > span found — the split never ran');
  if (errors.length > 0) problems.push(`${errors.length} console/page error(s): ${errors[0]}`);

  for (const line of result.lines) {
    if (line.escaped) {
      problems.push(`"${line.text}" still translated out of its mask (offset ${line.offsetInMask}px of ${line.maskHeight}px)`);
    }
    if (line.opacity !== '1') problems.push(`"${line.text}" opacity is ${line.opacity}`);
    if (line.height < 20) problems.push(`"${line.text}" is only ${line.height}px tall — the mask is clipping it to nothing`);
  }

  // The entrance must have moved the lines. A start offset equal to the end
  // offset means the tween wrote a start state and never progressed — the exact
  // silent failure this probe was written for.
  const started = result.startOffset?.[0];
  const ended = result.endOffset?.[0];
  if (started != null && ended != null && Math.abs(started - ended) < 1) {
    problems.push(`the lines never moved (${started}px → ${ended}px) — the tween wrote a start state but did not progress`);
  }

  if (problems.length === 0) {
    console.log(`  ok   ${label.padEnd(7)} h1=${result.h1Height}px lines=${result.lineCount} offset ${started}px → ${ended}px`);
  } else {
    failures += problems.length;
    console.log(`  FAIL ${label.padEnd(7)}`);
    for (const problem of problems) console.log(`         - ${problem}`);
  }

  await page.close();
}

await browser.close();

console.log('');
if (failures === 0) {
  console.log('HASIL: judul hero terlihat di semua viewport.');
  process.exit(0);
} else {
  console.log(`HASIL: ${failures} masalah pada judul hero.`);
  process.exit(1);
}
