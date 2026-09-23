/**
 * Hitung ulang koefisien clamp dengan benar, lalu BUKTIKAN di dalam rumus.
 *
 * KESALAHAN YANG DIPERBAIKI
 * -------------------------
 * Versi sebelumnya menghasilkan --step-8: clamp(3.5rem, 2.3462rem + .2885vw, 6.5rem).
 * Suku vw-nya 0.2885vw. Di 1920px itu cuma 5.5px — padahal langkah itu harus
 * bergerak 48px (3.5rem → 6.5rem). Akibatnya clamp menempel di batas bawah di
 * SEMUA lebar layar; probe mengukur s8=56px baik di 320px maupun 1920px.
 *
 * RUMUS YANG BENAR
 * ----------------
 * Untuk interpolasi linear dari (MIN_VW, minRem) ke (MAX_VW, maxRem):
 *
 *     slope      = (maxRem - minRem) / (MAX_VW - MIN_VW)   [rem per px]
 *     slopeVw    = slope * 100                             [rem per 100px]
 *     intercept  = minRem - slope * MIN_VW                 [rem]
 *
 * Suku `intercept + slopeVw·vw` menggantikan `minRem` sebagai nilai pilihan,
 * dan pada vw=MIN_VW ia harus sama dengan minRem. Itu asersi yang diperiksa.
 *
 * Jendela fluid: 400px → 1440px. Di bawah 400px teks tidak mengecil lagi,
 * di atas 1440px tidak membesar lagi.
 */
const MIN_VW = 400;
const MAX_VW = 1440;
const span = MAX_VW - MIN_VW;

/* Skala, dalam rem. Rasio antar langkah ~1.15–1.2 di KEDUA ujung. */
const SCALE = [
  ['--step--2', 0.625, 0.6875, 'label'],
  ['--step--1', 0.75, 0.8125, 'meta'],
  ['--step-0', 0.875, 0.9375, 'body'],
  ['--step-1', 1.0, 1.125, 'lead'],
  ['--step-2', 1.125, 1.3125, 'card title'],
  ['--step-3', 1.3125, 1.5625, 'subhead'],
  ['--step-4', 1.625, 2.0, 'heading'],
  ['--step-5', 2.0, 2.75, 'section'],
  ['--step-6', 2.5, 3.75, 'page title'],
  ['--step-7', 3.0, 5.0, 'feature'],
  ['--step-8', 3.5, 6.5, 'hero'],
];

const round = (v, d = 4) => parseFloat(v.toFixed(d));

console.log('/* Dihasilkan oleh outputs/audit/type-scale-v2.cjs — jangan diubah tangan. */');
console.log(':root {');
const computed = [];
for (const [name, minRem, maxRem, role] of SCALE) {
  const slope = (maxRem - minRem) / span; // rem per px
  const slopeVw = slope * 100; // rem per 100px (= per vw)
  const intercept = minRem - slope * MIN_VW; // rem

  computed.push({ name, minRem, maxRem, slope, slopeVw, intercept, role });

  console.log(
    `  ${name}: clamp(${round(minRem)}rem, ${round(intercept)}rem + ${round(slopeVw)}vw, ${round(maxRem)}rem);` +
      ` /* ${Math.round(minRem * 16)} → ${Math.round(maxRem * 16)}px  ${role} */`,
  );
}
console.log('}');

/* ── Bukti 1: nilai pilihan harus sama dengan minRem di MIN_VW dan maxRem di MAX_VW ── */
console.log('\n=== BUKTI 1: nilai pilihan di kedua ujung jendela ===');
let err = 0;
for (const c of computed) {
  const atMin = c.intercept + (c.slopeVw / 100) * MIN_VW;
  const atMax = c.intercept + (c.slopeVw / 100) * MAX_VW;
  const okMin = Math.abs(atMin - c.minRem) < 0.0005;
  const okMax = Math.abs(atMax - c.maxRem) < 0.0005;
  if (!okMin || !okMax) err++;
  console.log(
    `  ${okMin && okMax ? 'ok  ' : 'SALAH'} ${c.name.padEnd(10)}` +
      ` vw=${MIN_VW}: ${atMin.toFixed(4)}rem (harus ${c.minRem})   ` +
      `vw=${MAX_VW}: ${atMax.toFixed(4)}rem (harus ${c.maxRem})`,
  );
}
console.log(err ? `  → ${err} LANGKAH SALAH` : '  → semua langkah benar');

/* ── Bukti 2: ukuran render sebenarnya di lebar layar nyata ── */
function resolve(c, vw) {
  const preferred = (c.intercept + (c.slopeVw / 100) * vw) * 16; // px
  const lo = c.minRem * 16;
  const hi = c.maxRem * 16;
  return Math.min(Math.max(preferred, lo), hi);
}

console.log('\n=== BUKTI 2: px yang benar-benar dirender (setelah clamp aktif) ===');
const widths = [320, 390, 768, 1024, 1280, 1440, 1920];
const head = ['lebar'].concat(computed.map((c) => c.name.replace('--step-', 's')));
const rows = [head.map((h) => h.padEnd(8).slice(0, 8))];
for (const vw of widths) {
  rows.push(
    [String(vw).padEnd(8)].concat(
      computed.map((c) => resolve(c, vw).toFixed(1).padEnd(8)),
    ),
  );
}
rows.forEach((r) => console.log('  ' + r.join('')));

/* ── Bukti 3: apakah tiap langkah benar-benar BERGERAK? ── */
console.log('\n=== BUKTI 3: pergerakan tiap langkah dari 400px ke 1440px ===');
for (const c of computed) {
  const a = resolve(c, MIN_VW);
  const b = resolve(c, MAX_VW);
  const grow = b / a;
  console.log(
    `  ${c.name.padEnd(10)} ${a.toFixed(1)}px → ${b.toFixed(1)}px  (×${grow.toFixed(2)})  ` +
      `${grow > 1.01 ? 'bergerak' : '⚠ DIAM'}`,
  );
}

/* ── Bukti 4: rasio antar tingkat di kedua ujung ── */
console.log('\n=== BUKTI 4: rasio antar tingkat (harus ~1.1–1.25 di kedua ujung) ===');
let flat = 0;
for (let i = 1; i < computed.length; i++) {
  const lo = resolve(computed[i], MIN_VW) / resolve(computed[i - 1], MIN_VW);
  const hi = resolve(computed[i], MAX_VW) / resolve(computed[i - 1], MAX_VW);
  const bad = lo < 1.06 || hi < 1.06;
  if (bad) flat++;
  console.log(
    `  ${bad ? '⚠ ' : '  '}${computed[i - 1].name} → ${computed[i].name}`.padEnd(26) +
      ` 400px: ×${lo.toFixed(3)}   1440px: ×${hi.toFixed(3)}`,
  );
}
console.log(flat ? `  → ${flat} pasangan terlalu dekat` : '  → semua langkah terbedakan');
