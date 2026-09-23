/**
 * Bongkar kenapa --step-8 tetap 56px padahal CSS-nya benar.
 *
 * Fakta yang sudah pasti:
 *   - .next/static/css/7b8f...css berisi --step-8:clamp(3.5rem,2.3462rem+.2885vw,6.5rem)
 *   - HTML yang disajikan menunjuk tepat ke berkas itu
 *   - Tapi browser melaporkan s8=56px di lebar 1440px
 *
 * 56px = 3.5rem = batas BAWAH. clamp menempel di batas bawah artinya suku
 * pilihan (intercept + slopeVw·vw) DIBAWAH 3.5rem — yaitu kalau vw-nya kecil.
 * Kalau viewport benar-benar 1440px, .2885vw = 4.15px, jadi 2.3462rem+4.15px
 * = 37.5+4.15 = 41.7px, jauh di bawah 56px → clamp mengambil 56px.
 *
 * Jadi rumusnya memang kurang curam. Bukti 1 di generator tidak menangkapnya
 * karena memeriksa di vw=1440 (nilai pilihan = 6.5rem) padahal clamp-nya
 * sendiri sudah membatasi ke 6.5rem — sehingga pemeriksaan itu selalu lolos
 * apa pun koefisiennya. Yang menguji rumus dengan benar adalah mengganti vw
 * SATU PER SATU dengan nilai px, bukan mengalikan koefisien dengan angka vw
 * di dalam rumus yang sama.
 */
const MIN_VW = 400;
const MAX_VW = 1440;
const span = MAX_VW - MIN_VW;

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

/* ── Diagnosis koefisien LAMA ────────────────────────────────────────────── */
console.log('=== DIAGNOSIS: koefisien lama, apa yang sebenarnya terjadi ===\n');
const OLD = { name: '--step-8', minRem: 3.5, maxRem: 6.5, intercept: 2.3462, slopeVw: 0.2885 };
for (const vw of [320, 400, 768, 1024, 1440, 1920]) {
  const preferred = (OLD.intercept + (OLD.slopeVw / 100) * vw) * 16;
  const lo = OLD.minRem * 16;
  const hi = OLD.maxRem * 16;
  const rendered = Math.min(Math.max(preferred, lo), hi);
  const verdict = preferred < lo ? 'DIBAWAH batas bawah → pakai 56px' :
    preferred > hi ? 'DI ATAS batas atas → pakai 104px' : 'di dalam rentang';
  console.log(
    `  vw=${String(vw).padEnd(5)} pilihan=${preferred.toFixed(2)}px  ` +
      `rentang=[56,104]  render=${rendered.toFixed(1)}px  ${verdict}`,
  );
}

/* Berapa koefisien yang dibutuhkan agar 41.7px → 56px+ ? */
console.log('\n  Untuk mencapai 104px di vw=1440 dengan intercept 2.3462rem:');
const needed = ((6.5 - 2.3462) / (1440 / 100)) * 100;
console.log(
  `    slopeVw harus >= ${needed.toFixed(4)}  (sekarang ${OLD.slopeVw}) → ` +
    `kurang ${(needed / OLD.slopeVw).toFixed(1)}× lipat`,
);

/* ── Rumus yang benar, diuji dengan mengganti vw per nilai ──────────────── */
console.log('\n\n=== RUMUS BARU, diuji dengan vw diganti angka nyata ===\n');
const computed = [];
for (const [name, minRem, maxRem, role] of SCALE) {
  const slope = (maxRem - minRem) / span; // rem per px
  const slopeVw = slope * 100; // rem per 100px
  const intercept = minRem - slope * MIN_VW;
  computed.push({ name, minRem, maxRem, slopeVw, intercept, role });
}

console.log('/* --- siap ditempel --- */');
console.log(':root {');
for (const c of computed) {
  console.log(
    `  ${c.name}: clamp(${c.minRem}rem, ${c.intercept.toFixed(4)}rem + ${c.slopeVw.toFixed(4)}vw, ${c.maxRem}rem);` +
      ` /* ${Math.round(c.minRem * 16)}→${Math.round(c.maxRem * 16)}px ${c.role} */`,
  );
}
console.log('}');

/* Verifikasi dengan cara yang benar: ganti vw, jangan pakai rumus yang sama. */
const widths = [320, 390, 400, 768, 1024, 1280, 1440, 1920];
console.log('\n  lebar  ' + computed.map((c) => c.name.replace('--step-', 's').padEnd(7)).join(''));
let bad = 0;
for (const vw of widths) {
  const cells = computed.map((c) => {
    const preferred = (c.intercept + (c.slopeVw / 100) * vw) * 16;
    const lo = c.minRem * 16;
    const hi = c.maxRem * 16;
    return Math.min(Math.max(preferred, lo), hi).toFixed(1).padEnd(7);
  });
  console.log('  ' + String(vw).padEnd(7) + cells.join(''));
}

/* Titik yang paling penting: apakah SETIAP langkah bergerak antara 400 dan 1440? */
console.log('\n=== apakah tiap langkah benar-benar bergerak? ===');
for (const c of computed) {
  const at = (vw) => {
    const p = (c.intercept + (c.slopeVw / 100) * vw) * 16;
    return Math.min(Math.max(p, c.minRem * 16), c.maxRem * 16);
  };
  const a = at(MIN_VW);
  const b = at(MAX_VW);
  const grows = b > a + 0.5;
  if (!grows) bad++;
  console.log(
    `  ${grows ? 'ok  ' : 'GAGAL'} ${c.name.padEnd(10)} ${a.toFixed(1)}px → ${b.toFixed(1)}px ` +
      `(×${(b / a).toFixed(2)})`,
  );
}
console.log(bad ? `\n  → ${bad} langkah TIDAK bergerak` : '\n  → semua langkah bergerak antara 400px dan 1440px');
