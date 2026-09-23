/**
 * Cari SEMUA ukuran teks yang belum pindah ke skala.
 *
 * Skrip migrasi sebelumnya bekerja dari daftar pola yang saya tulis tangan,
 * dan daftar itu melewatkan dua bentuk:
 *   - varian berimbuhan, mis. `sm:text-[1.35rem]` — pola saya menuntut
 *     `text-[` tepat sebelum angkanya
 *   - clamp() yang nilainya tidak saya masukkan ke daftar
 *
 * Pelajaran: jangan cari yang kamu sudah tahu ada. Cari SEMUA, lalu saring.
 * Skrip ini membaca setiap literal ukuran teks di src/ dan melaporkan mana
 * pun yang bukan var(--step-*), apa pun bentuknya.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(ROOT, 'src');

const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts|css)$/.test(e.name)) out.push(p);
  }
  return out;
};

/* Literal ukuran teks apa pun: text-[...], font-size: ... */
const PATTERNS = [
  /text-\[([^\]]+)\]/g, // Tailwind arbitrary value (any prefix, any variant)
  /font-size\s*:\s*([^;}\n]+)/g,
];

const rows = [];

for (const file of walk(SRC)) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

  lines.forEach((line, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return; // comment

    for (const re of PATTERNS) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(line))) {
        const value = m[1].trim();

        /* Sudah memakai skala → lewat. */
        if (/var\(--step-/.test(value)) continue;

        /* Bukan ukuran teks: warna, font-family, spacing, dsb. */
        if (/^(var\(--color|var\(--font|#|\d+px\])/.test(value)) continue;
        /* Hanya minat pada nilai yang benar-benar menyatakan panjang teks. */
        if (!/\d/.test(value)) continue;
        if (!/(rem|px|em|vw|calc|clamp)/.test(value)) continue;

        rows.push({
          rel,
          line: i + 1,
          value,
          snippet: line.trim().replace(/\s+/g, ' ').slice(0, 72),
        });
      }
    }
  });
}

rows.sort((a, b) => a.rel.localeCompare(b.rel) || a.line - b.line);

if (!rows.length) {
  console.log('\n  Tidak ada ukuran teks literal yang tersisa — semua memakai skala.\n');
} else {
  console.log(`\n=== ${rows.length} ukuran teks literal yang BELUM memakai skala ===\n`);
  let lastFile = null;
  for (const r of rows) {
    if (r.rel !== lastFile) {
      console.log(`\n  ${r.rel}`);
      lastFile = r.rel;
    }
    console.log(`    :${String(r.line).padEnd(5)} ${r.value}`);
    console.log(`           ${r.snippet}`);
  }
}

/* Ringkas per nilai, supaya kelihatan mana yang paling sering muncul. */
const byValue = {};
for (const r of rows) byValue[r.value] = (byValue[r.value] || 0) + 1;
if (rows.length) {
  console.log('\n=== nilai yang paling sering tersisa ===');
  Object.entries(byValue)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([v, n]) => console.log(`  ${String(n).padStart(3)}×  ${v}`));
}
