/**
 * Verifies the SAMPLE_DATA switch by reading the rendered HTML.
 *
 * The point of a toggle is that both positions are observable, so this probe
 * reports the `[CONTOH]` marker count on each public route. Run it twice — once
 * with SAMPLE_DATA=on and once without — and the difference is the proof.
 *
 *   node outputs/audit/probe-sample.mjs http://127.0.0.1:3011
 */

const base = process.argv[2] ?? 'http://127.0.0.1:3011';

const routes = ['/', '/berita', '/kegiatan', '/karya', '/galeri', '/tentang'];

let total = 0;

for (const route of routes) {
  const res = await fetch(`${base}${route}`);
  const html = await res.text();
  const marks = (html.match(/CONTOH/g) ?? []).length;
  total += marks;

  const status = String(res.status);
  const label = route.padEnd(10);
  const count = String(marks).padStart(3);
  console.log(`${label} status=${status} contoh=${count}`);
}

console.log(`\nTotal penanda [CONTOH]: ${total}`);
console.log(total > 0 ? 'Sampel data: AKTIF' : 'Sampel data: MATI');
