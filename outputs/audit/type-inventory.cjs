/**
 * Mendaftar setiap penggunaan ukuran teks di seluruh `src/`, beserta perannya.
 *
 * Tujuannya bukan menghasilkan angka — melainkan melihat apakah skalanya
 * konsisten. Skala yang baik punya rasio yang teratur; skala yang buruk punya
 * angka yang kebetulan.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = 'src';

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(tsx?|css)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const files = walk(ROOT);

// Kumpulkan (ukuran -> daftar lokasi).
const sizes = new Map();
const add = (size, file, line, context) => {
  if (!sizes.has(size)) sizes.set(size, []);
  sizes.get(size).push({ file, line, context });
};

// Hex/bentuk angka dari px, rem, clamp.
const RE_REM = /text-\[([0-9.]+)rem\]/g;
const RE_PX = /text-\[([0-9.]+)px\]/g;
const RE_CLAMP = /text-\[clamp\(([^)]+)\)\]/g;

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split('\n');
  lines.forEach((ln, i) => {
    for (const m of ln.matchAll(RE_REM)) add(`${m[1]}rem`, file, i + 1, ln.trim().slice(0, 90));
    for (const m of ln.matchAll(RE_PX)) add(`${m[1]}px`, file, i + 1, ln.trim().slice(0, 90));
    for (const m of ln.matchAll(RE_CLAMP)) add(`clamp(${m[1]})`, file, i + 1, ln.trim().slice(0, 90));
  });
}

// Tabel: ukuran rem -> px (asumsi 16px).
const toPx = (s) => {
  const m = s.match(/^([0-9.]+)rem$/);
  if (!m) return null;
  return Math.round(parseFloat(m[1]) * 16 * 100) / 100;
};

console.log('=== UKURAN REM (px @16) ===');
const rems = [...sizes.keys()].filter((s) => s.endsWith('rem')).map((s) => [toPx(s), s]);
rems.sort((a, b) => a[0] - b[0]);
let prev = null;
for (const [px, key] of rems) {
  const count = sizes.get(key).length;
  let ratio = '';
  if (prev !== null && prev > 0) ratio = ` (×${(px / prev).toFixed(3)})`;
  console.log(`  ${String(px).padStart(7)}px  ${key.padEnd(12)} ${String(count).padStart(3)}×  ${ratio}`);
  prev = px;
}

console.log('\n=== RENTANG CLAMP ===');
const clamps = [...sizes.keys()].filter((s) => s.startsWith('clamp'));
for (const k of clamps) {
  const nums = k.replace('clamp(', '').replace(')', '').split(',').map((x) => x.trim());
  const min = nums[0];
  const max = nums[2] ?? nums[1];
  const minPx = parseFloat(min) * 16;
  const maxPx = parseFloat(max) * 16;
  console.log(
    `  ${String(Math.round(minPx)).padStart(4)} → ${String(Math.round(maxPx)).padStart(4)}px   ${k.padEnd(38)} ${sizes.get(k).length}×`,
  );
}

console.log('\n=== SIAPA PAKAI APA (20 penggunaan terbanyak) ===');
const flat = [];
for (const [size, list] of sizes) for (const e of list) flat.push({ size, ...e });
for (const [size, list] of [...sizes.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 20)) {
  console.log(`\n  ${size}  (${list.length}×)`);
  for (const e of list.slice(0, 6)) {
    console.log(`      ${e.file.replace(/\\/g, '/')}:${e.line}`);
  }
  if (list.length > 6) console.log(`      … +${list.length - 6} lagi`);
}
