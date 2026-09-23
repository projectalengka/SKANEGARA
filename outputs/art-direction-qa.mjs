import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = require('playwright-core');
const base = process.argv[2] || 'http://127.0.0.1:3000';
const phase = process.argv[3] || 'before';
const out = 'C:/Users/User/Documents/SKAGARA/outputs';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const report = { phase, viewports: [], failures: [] };
for (const width of [1440, 320, 375, 390, 414, 768, 1024, 1920]) {
  const context = await browser.newContext({ viewport: { width, height: width > 1000 ? 900 : 844 }, hasTouch: width < 768, isMobile: width < 768 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(base, { waitUntil: 'load' });
  await page.waitForTimeout(2400);
  await page.screenshot({ path: `${out}/${phase}-hero-${width}.png` });
  await page.locator('h1').screenshot({ path: `${out}/${phase}-headline-${width}.png` });
  const headline = await page.locator('h1').innerText();
  const sectionNames = [];
  for (const section of await page.locator('main > section').all()) {
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1100);
    sectionNames.push(await section.getAttribute('aria-labelledby'));
  }
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += innerHeight * .7) { window.scrollTo({ top: y, behavior: 'instant' }); await new Promise(r => setTimeout(r, 100)); } });
  await page.waitForTimeout(1300);
  if ([1440, 390].includes(width)) await page.screenshot({ path: `${out}/${phase}-home-${width}.png`, fullPage: true });
  const metrics = await page.evaluate(() => ({
    width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
    overflow: document.documentElement.scrollWidth > innerWidth + 1,
    lenis: document.documentElement.classList.contains('lenis'), cursor: getComputedStyle(document.body).cursor,
    hidden: [...document.querySelectorAll('[data-reveal]')].filter(e => e.getBoundingClientRect().height && +getComputedStyle(e).opacity < .95).map(e => e.textContent.slice(0, 70)),
    fonts: document.fonts.check('600 48px "Instrument Sans"'),
    broken: [...document.images].filter(e => e.complete && !e.naturalWidth).map(e => e.src),
  }));
  if ([1440, 390].includes(width)) for (const name of ['judul-program', 'judul-karya', 'judul-galeri', 'judul-ajakan']) {
    const section = page.locator(`section[aria-labelledby="${name}"]`);
    if (await section.count()) await section.screenshot({ path: `${out}/${phase}-${name}-${width}.png` });
  }
  const gallery = page.getByRole('button', { name: /^Buka foto:/ }).first();
  if (await gallery.count()) {
    await gallery.click();
    await page.waitForTimeout(200);
    metrics.dialog = await page.getByRole('dialog').evaluate(el => ({ width: el.getBoundingClientRect().width, scrollWidth: el.scrollWidth, focusInside: el.contains(document.activeElement) }));
    if ([320, 390, 1440].includes(width)) await page.screenshot({ path: `${out}/${phase}-lightbox-${width}.png` });
    await page.keyboard.press('ArrowRight');
    metrics.dialogNext = await page.getByRole('dialog').getAttribute('aria-label');
    await page.keyboard.press('Escape');
    metrics.focusRestored = await gallery.evaluate(el => el === document.activeElement);
  }
  if (width < 1024) {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    const toggle = page.getByRole('button', { name: 'Buka menu' });
    await toggle.click();
    await page.waitForTimeout(850);
    if ([320, 390].includes(width)) await page.screenshot({ path: `${out}/${phase}-menu-${width}.png` });
    metrics.menu = await page.locator('#menu-seluler').evaluate(el => ({ height: el.clientHeight, scrollHeight: el.scrollHeight, inert: el.inert }));
    await page.keyboard.press('Escape');
  }
  report.viewports.push({ width, headline, sectionNames, errors, ...metrics });
  if (metrics.overflow || metrics.hidden.length || errors.length || metrics.broken.length || (metrics.dialog && metrics.dialog.scrollWidth > width + 1)) report.failures.push(`${width}: ${JSON.stringify(metrics)}`);
  console.log(phase, width, JSON.stringify(metrics), errors);
  await context.close();
}
for (const setting of ['reducedMotion', 'noJavaScript']) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, ...(setting === 'reducedMotion' ? { reducedMotion: 'reduce' } : { javaScriptEnabled: false }) });
  await page.goto(base, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  report[setting] = await page.locator('h1').evaluate(el => ({ opacity: getComputedStyle(el).opacity, height: el.getBoundingClientRect().height, lenis: document.documentElement.classList.contains('lenis'), hidden: [...document.querySelectorAll('[data-reveal]')].filter(e => getComputedStyle(e).opacity === '0').length }));
  await page.screenshot({ path: `${out}/${phase}-${setting}.png` });
  await page.close();
}
await browser.close();
writeFileSync(`${out}/${phase}-art-direction-qa.json`, JSON.stringify(report, null, 2));
console.log('SUMMARY', JSON.stringify(report));
if (phase !== 'before' && (report.failures.length || report.noJavaScript.opacity !== '1' || report.reducedMotion.hidden || report.reducedMotion.lenis)) process.exitCode = 1;
