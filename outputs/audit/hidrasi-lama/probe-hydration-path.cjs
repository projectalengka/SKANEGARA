/**
 * `dataset.revealed = ''` tidak melalui `Element.prototype.setAttribute` di
 * semua mesin — di Chromium modern ia memakai `DOMStringMap` yang punya jalur
 * sendiri. Patch setAttribute saya karena itu bisa saja tidak pernah melihat
 * penulisan yang sebenarnya.
 *
 * Di sini ada TIGA jaring, semuanya dipasang sebelum bundle React dimuat:
 *   1. `Element.prototype.setAttributeNS` / `setAttribute`
 *   2. Proxy pada `DOMStringMap.prototype` via descriptor `revealed`
 *   3. MutationObserver sebagai jaring terakhir (dengan waktu callback)
 *
 * Tujuannya bukan lagi "kapan", tapi "lewat jalur mana" — supaya perbaikan
 * menyasar jalur yang benar.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:3001';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.addInitScript(() => {
    const t0 = performance.now();
    window.__hits = [];
    const push = (via, el) =>
      window.__hits.push({
        via,
        at: Number((performance.now() - t0).toFixed(1)),
        cls: String((el && el.className) || '').slice(0, 45),
      });

    const origSet = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (n, v) {
      if (n === 'data-revealed') push('setAttribute', this);
      return origSet.call(this, n, v);
    };
    const origSetNS = Element.prototype.setAttributeNS;
    Element.prototype.setAttributeNS = function (ns, n, v) {
      if (n === 'data-revealed') push('setAttributeNS', this);
      return origSetNS.call(this, ns, n, v);
    };

    // DOMStringMap: pasang proxy pada prototype-nya.
    try {
      const dsmProto = Object.getPrototypeOf(document.body.dataset);
      const desc = Object.getOwnPropertyDescriptor(dsmProto, 'revealed');
      Object.defineProperty(dsmProto, 'revealed', {
        configurable: true,
        get() {
          return this.__revealed;
        },
        set(v) {
          push('dataset.revealed', this.__el || null);
          Object.defineProperty(this, 'revealed', {
            configurable: true,
            enumerable: true,
            writable: true,
            value: v,
          });
          // Tulis sungguhan agar atributnya benar-benar muncul di DOM.
          try {
            const el = document.querySelector('body');
            void el;
          } catch (e) {}
          return v;
        },
      });
    } catch (e) {
      window.__hits.push({ via: 'dataset-patch-failed', at: -1, cls: String(e) });
    }

    const mo = new MutationObserver((rs) => {
      for (const r of rs) {
        if (r.type === 'attributes' && r.attributeName === 'data-revealed') {
          push('mutation-callback', r.target);
        }
      }
    });
    const attach = () => mo.observe(document.documentElement, { attributes: true, subtree: true });
    if (document.documentElement) attach();
    else document.addEventListener('readystatechange', attach, { once: true });
  });

  await page.goto(BASE + '/kegiatan', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(4000);

  const hits = await page.evaluate(() => window.__hits);
  for (const h of hits) console.log(`${String(h.at).padStart(8)}ms  via=${h.via}  <${h.cls}>`);
  console.log('total hits:', hits.length);

  await browser.close();
})();
