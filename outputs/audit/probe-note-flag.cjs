/**
 * Is the "Ilustrasi program" flag actually broken, or just small?
 *
 * The CSS pins it to `bottom: 0` of the hero program image box. In the desktop
 * hero that box is tiny (w-14 ≈ 56px), so the question is whether the label's
 * text fits its own padding box. `scrollWidth > clientWidth` is the objective
 * signal for horizontal overflow; a clipped word can also be caught by
 * comparing the text node's rendered rect to its container.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });

  for (const [label, viewport] of [
    ['desktop 1440', { width: 1440, height: 900 }],
    ['mobile 390', { width: 390, height: 844 }],
  ]) {
    const page = await browser.newPage({ viewport });
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(2200);

    const rows = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.hero-program')).map((a) => {
        const box = a.querySelector('.hero-program__image');
        const note = a.querySelector('.hero-program__note');
        if (!box || !note) return { note: 'absent' };
        const br = box.getBoundingClientRect();
        const nr = note.getBoundingClientRect();
        const cs = getComputedStyle(note);
        return {
          name: a.querySelector('.hero-program__caption span:nth-child(2)')?.textContent ?? '?',
          boxBox: `${Math.round(br.width)}x${Math.round(br.height)}`,
          noteBox: `${Math.round(nr.width)}x${Math.round(nr.height)}`,
          scrollW: note.scrollWidth,
          clientW: note.clientWidth,
          overflowsX: note.scrollWidth > note.clientWidth + 1,
          overflowsBoxTop: nr.top < br.top - 1,
          fontSize: cs.fontSize,
          lineHeight: cs.lineHeight,
          lines: Math.round(nr.height / parseFloat(cs.lineHeight || '10')),
          text: note.textContent,
        };
      });
    });

    console.log(`\n===== ${label} =====`);
    for (const r of rows) console.log(JSON.stringify(r));

    await page.close();
  }

  await browser.close();
})();
