/**
 * Diagnosis: apa yang sebenarnya salah dengan skala yang ada sekarang?
 *
 * Tiga hal yang diukur:
 *
 *   1. RASIO. Skala tipe yang baik punya rasio yang teratur antar tingkat
 *      (mis. 1.25 = major third). Skala yang buruk punya rasio yang melompat
 *      atau nyaris sama — 18px lalu 18.4px adalah dua tingkat yang tidak bisa
 *      dibedakan mata tapi tetap dihitung sebagai dua keputusan.
 *
 *   2. JUMLAH TINGKAT. 12 ukuran rem + 20 clamp = 32 ukuran berbeda. Itu bukan
 *      hierarki, itu daftar. Hierarki yang bisa dibaca punya ~6-8 tingkat.
 *
 *   3. RASIO FRAKSIONAL. `1.35rem` (21.6px) dan `1.15rem` (18.4px) duduk di
 *      antara tingkat yang jelas. Angka desimal seperti ini muncul saat ukuran
 *      dipilih "sekalian biar pas", bukan dari skala.
 */
const fs = require('node:fs');
const path = require('node:path');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.(tsx?|css)$/.test(e.name)) out.push(full);
  }
  return out;
}

const sizes = new Set();
for (const f of walk('src')) {
  const t = fs.readFileSync(f, 'utf8');
  for (const m of t.matchAll(/text-\[([0-9.]+)rem\]/g)) sizes.add(parseFloat(m[1]) * 16);
  for (const m of t.matchAll(/text-\[clamp\(([^)]+)\)\]/g)) {
    const parts = m[1].split(',').map((x) => x.trim());
    sizes.add(Math.round(parseFloat(parts[0]) * 16));
    sizes.add(Math.round(parseFloat(parts[parts.length - 1]) * 16));
  }
}
// Tambahkan tingkat dari tokens.css.
const tokens = fs.readFileSync('src/styles/tokens.css', 'utf8');
for (const m of tokens.matchAll(/--step-(-?\d+):\s*clamp\(([^)]+)\)/g)) {
  const parts = m[2].split(',').map((x) => x.trim());
  sizes.add(Math.round(parseFloat(parts[0]) * 16));
  sizes.add(Math.round(parseFloat(parts[parts.length - 1]) * 16));
}

const sorted = [...sizes].sort((a, b) => a - b);
console.log(`Total ukuran berbeda yang dipakai di seluruh situs: ${sorted.length}`);
console.log(`Rentang: ${sorted[0]}px → ${sorted[sorted.length - 1]}px\n`);

console.log('Rasio antar ukuran yang berdekatan (di bawah ~1.06 sulit dibedakan mata):');
let tooClose = 0;
let uneven = 0;
const ratios = [];
for (let i = 1; i < sorted.length; i++) {
  const r = sorted[i] / sorted[i - 1];
  ratios.push(r);
  const flag = r < 1.06 ? '  <-- TERLALU DEKAT' : '';
  if (r < 1.06) tooClose++;
  console.log(`  ${String(sorted[i - 1]).padStart(4)}px → ${String(sorted[i]).padStart(4)}px   ×${r.toFixed(3)}${flag}`);
}

console.log(`\nPasangan yang terlalu dekat (<1.06): ${tooClose}`);
const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length;
const spread = Math.max(...ratios) / Math.min(...ratios);
console.log(`Rasio rata-rata: ${avg.toFixed(3)}`);
console.log(`Rentang rasio: ${Math.min(...ratios).toFixed(3)} → ${Math.max(...ratios).toFixed(3)} (sebaran ${spread.toFixed(1)}×)`);
console.log('\nSebaran rasio yang lebar berarti skalanya tidak konsisten:');
console.log('sebagian tingkat nyaris sama, sebagian melompat jauh.');
