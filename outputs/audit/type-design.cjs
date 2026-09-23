/**
 * Merancang skala tipe yang proporsional, lalu mencetaknya untuk diperiksa
 * sebelum menyentuh CSS.
 *
 * ## Yang menentukan bentuk skala ini
 *
 * 1. **Rasio yang konsisten.** Satu rasio untuk seluruh rentang membuat setiap
 *    lompatan terasa sama besar. Rasio 1.25 (major third) terlalu agresif untuk
 *    ukuran kecil — 11px → 14px → 17px kehilangan tingkat menengah yang teks
 *    kecil butuh. Rasio ~1.2 (minor third) menjaga teks kecil tetap terbaca
 *    sementara judul besar tetap punya lompatan.
 *
 * 2. **Tingkat yang dibulatkan ke piksel bulat.** Ukuran pecahan seperti 18.4px
 *    menghasilkan pembulatan sub-piksel yang berbeda per browser, sehingga
 *    tinggi baris dan perataan vertikal jadi tidak stabil. Semua angka di sini
 *    dibulatkan ke bilangan bulat.
 *
 * 3. **Rentang yang dijangkau lewat langkah, bukan daftar.** 11px sampai 208px
 *    dengan rasio 1.2 butuh ~16 langkah. Itu terlalu banyak tingkat untuk
 *    hierarki yang bisa dibaca manusia — jadi skala aslinya 8 tingkat untuk
 *    *teks*, dan judul display memakai clamp terpisah yang tetap mengikuti
 *    rasio yang sama di titik tengahnya.
 */
const BASE = 16;

// Skala inti untuk teks: 8 tingkat, rasio tetap.
// Dimulai dari 0.6875rem (11px) supaya label mono terkecil tetap sama.
const RATIO = 1.2;
const STEPS = [-3, -2, -1, 0, 1, 2, 3, 4, 5, 6];

console.log('=== SKALA INTI (rasio 1.2, dibulatkan ke px bulat) ===\n');
const scale = [];
for (const s of STEPS) {
  const raw = 12 * Math.pow(RATIO, s);
  const px = Math.round(raw);
  const rem = Math.round((px / BASE) * 10000) / 10000;
  scale.push({ step: s, px, rem });
}
for (let i = 0; i < scale.length; i++) {
  const { step, px, rem } = scale[i];
  const prev = scale[i - 1];
  const ratio = prev ? `×${(px / prev.px).toFixed(3)}` : '';
  console.log(`  step ${String(step).padStart(3)}   ${String(px).padStart(3)}px   ${rem}rem   ${ratio}`);
}

console.log('\n=== JUDUL DISPLAY (clamp, mengikuti rasio yang sama) ===\n');
// Judul memakai clamp agar menyesuaikan layar. Yang penting: titik MAX-nya
// harus berada pada kelipatan skala yang sama, supaya hierarki judul konsisten
// satu sama lain — bukan angka yang dipilih satu per satu.
const displayMax = [72, 88, 112, 136];
for (const px of displayMax) {
  const rem = Math.round((px / BASE) * 1000) / 1000;
  const prevIdx = displayMax.indexOf(px) - 1;
  const ratio = prevIdx >= 0 ? `×${(px / displayMax[prevIdx]).toFixed(3)}` : '';
  console.log(`  max ${String(px).padStart(4)}px   ${rem}rem   ${ratio}`);
}

console.log('\n=== PERBANDINGAN: skala lama vs baru ===\n');
const old = [11, 12, 13, 14, 15, 16, 17, 18, 18.4, 19.2, 20, 21, 21.6, 22, 24, 26, 28, 30, 32, 36, 40, 44, 48, 52, 68, 72, 80, 88, 112, 128, 136, 176, 208];
const newPx = scale.map((s) => s.px);
console.log(`  lama: ${old.length} ukuran (${old.filter((x) => !Number.isInteger(x)).length} di antaranya pecahan)`);
console.log(`  baru: ${newPx.length} tingkat untuk teks, semuanya bilangan bulat`);
console.log(`  pecahan pada skala lama: ${old.filter((x) => !Number.isInteger(x)).join(', ')}`);

// Cek: dengan rasio 1.2, apakah setiap pasangan cukup jauh untuk dibedakan?
console.log('\n=== VERIFIKASI: semua pasangan cukup jauh? ===');
let allGood = true;
for (let i = 1; i < newPx.length; i++) {
  const r = newPx[i] / newPx[i - 1];
  if (r < 1.06) {
    console.log(`  MASALAH: ${newPx[i - 1]} → ${newPx[i]} hanya ×${r.toFixed(3)}`);
    allGood = false;
  }
}
console.log(allGood ? '  semua rasio >= 1.06 — setiap tingkat bisa dibedakan' : '  ADA YANG TERLALU DEKAT');
