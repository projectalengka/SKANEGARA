/**
 * Skala tipografi fluid — generator kanonik.
 *
 * MENYELESAIKAN DENGAN SUBSTITUSI, BUKAN DENGAN ALJABAR YANG DITURUNKAN SENDIRI
 * -----------------------------------------------------------------------------
 * Sejarah singkat, karena ini bagian yang paling sulit dan sudah salah dua kali:
 *
 *   Nilai pilihan clamp adalah `A + B·vw`. Ia harus memenuhi dua jangkar:
 *       A + B·4.0  = minRem      (400px  = 4.0vw)
 *       A + B·14.4 = maxRem      (1440px = 14.4vw)
 *
 *   Kurangi lalu selesaikan:
 *       B = (maxRem − minRem) / 10.4
 *       A = minRem − B·4
 *
 * Angka 10.4 itu hanya 14.4 − 4.0. Tidak ada perkalian 100, tidak ada
 * pembagian 16 pada B. Dua versi sebelumnya menambahkan salah satu dari itu
 * dan menghasilkan skala yang menempel di batas bawah (16× terlalu kecil)
 * atau menempel di batas atas (10× terlalu besar). Keduanya terlihat "tenang"
 * di satu tangkapan layar, bukan rusak.
 *
 * Cara memeriksa di bawah ini sengaja yang paling bodoh: ganti vw dengan angka
 * nyata, cetak px-nya, dan tolak kalau ada langkah yang tidak bergerak.
 */
const MIN_VW = 400;
const MAX_VW = 1440;

/* Kedua batas dinyatakan dalam vw, supaya rumusnya tidak perlu konversi. */
const MIN_VW_U = MIN_VW / 100; // 4.0
const MAX_VW_U = MAX_VW / 100; // 14.4

/**
 * Skala, dalam px pada kedua ujung jendela.
 *
 * LANTAI DUA LANGKAH TERATAS DITENTUKAN OLEH PENGUKURAN, BUKAN SELERA
 * -------------------------------------------------------------------
 * Dua kesalahan sudah terjadi di sini, keduanya dari menebak alih-alih
 * mengukur, dan keduanya tidak terlihat di tangkapan layar desktop:
 *
 *   1. --step-7 dan --step-8 diberi lantai sama (48px) sehingga keduanya
 *      dirender identik di bawah 400px — rasio ×1.000, tepat cacat yang skala
 *      ini dibuat untuk menghilangkan.
 *   2. Kata yang dipakai untuk menetapkan lantai salah. Versi sebelumnya
 *      memakai "Berkembang." (285px), padahal kata terpanjang yang benar-benar
 *      dirender di langkah teratas adalah "Keterampilan" pada judul hero —
 *      juga 285px, tapi ia tinggal di dalam line-mask selebar 280px, sehingga
 *      5px huruf terakhirnya terpotong diam-diam oleh `overflow: hidden`.
 *
 * Diukur di 320px (probe-floor-dump.cjs + probe-hero-source.cjs), 280px ruang:
 *
 *   .hero-editorial__title "Keterampilan"  285px @48px  → LUBER 5px
 *   Introduction.tsx       "Berkembang."   285px @48px  → 44px = 261px, aman
 *   semua judul lain       < 250px                      → longgar
 *
 * Hanya itu satu-satunya kata yang benar-benar terpotong. Dua kandidat lain
 * yang terlihat serupa sudah diperiksa dan TERBUKTI artefak probe, bukan bug:
 * wordmark footer ("SMK" di atas "Jayanegara") dan judul dengan <br>
 * ("Agenda" + "sekolah.") — textContent menempelkan barisnya menjadi satu kata
 * palsu, sementara browser sudah membungkusnya. Tandanya: lineCount > 1.
 *
 * LANTAI EMPAT LANGKAH TERATAS DISELESAIKAN SEBAGAI SATU SISTEM
 * -------------------------------------------------------------
 * Menurunkan satu lantai saja selalu memindahkan tabrakan ke langkah di
 * bawahnya (48/48 → 44/48 → 40/40), karena lantai di paruh atas terlalu
 * rapat. Jadi keempatnya diselesaikan sekaligus, sebagai barisan geometris di
 * dalam selang yang sudah ditentukan pengukuran:
 *
 *   batas bawah 26px  — lantai --step-4, sudah terverifikasi aman
 *   batas atas  47px  — "Keterampilan" muat sampai 279.1px di 47px
 *
 *   r = (47/26)^(1/4) = 1.1595  →  26, 30.2, 35.0, 40.5, 47
 *   dibulatkan      →  26, 30,   35,   41,   47   (rasio 1.146–1.171)
 *
 * Rasio seragam ~1.16 itu memang yang diinginkan: jarak antar tingkat di paruh
 * atas jadi konsisten, bukan mengecil tiap kali satu lantai diturunkan. Ujung
 * atasnya tidak disentuh — 32, 44, 60, 80, 104 — jadi tampilan desktop sama
 * sekali tidak berubah; yang berubah hanya ukuran di ponsel sempit.
 */
const SCALE = [
  ['--step--2', 10, 11, 'label'],
  ['--step--1', 12, 13, 'meta'],
  ['--step-0', 14, 15, 'body'],
  ['--step-1', 16, 18, 'lead'],
  ['--step-2', 18, 21, 'card title'],
  ['--step-3', 21, 25, 'subhead'],
  ['--step-4', 26, 32, 'heading'],
  ['--step-5', 30, 44, 'section'],
  ['--step-6', 35, 60, 'page title'],
  ['--step-7', 41, 80, 'feature'],
  ['--step-8', 47, 104, 'hero'],
];

/* Selesaikan A dan B dari dua jangkar.
 *
 * SATUAN — ini sumber bug yang sudah tiga kali muncul di proyek ini
 * -----------------------------------------------------------------
 * Dalam CSS, satuan `rem` dan `vw` TIDAK setara dan tidak boleh dihitung
 * dengan rumus yang sama:
 *
 *   A dinyatakan dalam `rem`  → browser mengalikannya dengan root font (16px)
 *   B dinyatakan dalam `vw`   → browser mengalikannya dengan viewport/100
 *
 * Jadi suku pilihan, dalam px, adalah:
 *
 *   preferred_px = A_rem·16 + B_vw·(viewport/100)
 *
 * Dengan menyatakan viewport sebagai `u` (= viewport/100, jadi 4.0 di 400px
 * dan 14.4 di 1440px), kedua jangkar menjadi:
 *
 *   A_rem·16 + B_vw·4.0  = minPx
 *   A_rem·16 + B_vw·14.4 = maxPx
 *
 * Perhatikan: A_rem selalu muncul bersama ·16. Jadi yang benar-benar
 * diselesaikan adalah `K = A_rem·16` (konstanta dalam px), bukan `A`:
 *
 *   B_vw = (maxPx − minPx) / 10.4          [px per vw-unit]
 *   K    = minPx − B_vw·4.0                [px]
 *   A_rem = K / 16                          [rem]
 *
 * Versi sebelumnya menghitung `B` dalam rem-per-vw lalu MENULISKANNYA apa
 * adanya sebagai `vw`. Itu membuang faktor 16 pada suku B saja, sehingga
 * preferred hanya mencapai (47 + 57/16) = 50.6px di 1440px — jauh di bawah
 * plafon 104 — dan clamp menempel di lantai di SEMUA lebar. Persis kegagalan
 * "B terlalu kecil" yang diperingatkan di komentar tokens.css, dan persis
 * kesalahan yang sama yang pernah terjadi sebelumnya.
 *
 * Karena itu di bawah ada `verifyAgainstAnchors()`, yang memeriksa hasilnya
 * dengan mengganti angka viewport nyata — bukan dengan mengulang rumus yang
 * sama, karena rumus yang salah akan selalu setuju dengan dirinya sendiri.
 */
const solve = (minPx, maxPx) => {
  const B_vw = (maxPx - minPx) / (MAX_VW_U - MIN_VW_U); // px per vw-unit
  const K = minPx - B_vw * MIN_VW_U; // px
  const A_rem = K / 16; // rem
  return { A_rem, B_vw, minRem: minPx / 16, maxRem: maxPx / 16, K };
};

/* Nilai px yang benar-benar dirender setelah clamp aktif. Semua satuan
 * dikembalikan ke px lebih dulu — itulah inti perbaikannya. */
const render = (s, vw) => {
  const preferredPx = s.A_rem * 16 + s.B_vw * (vw / 100);
  return Math.min(Math.max(preferredPx, s.minRem * 16), s.maxRem * 16);
};

const computed = SCALE.map(([name, minPx, maxPx, role]) => ({
  name,
  minPx,
  maxPx,
  role,
  ...solve(minPx, maxPx),
}));

/**
 * Gerbang yang tidak bisa dilalui rumus yang salah: ganti angka viewport
 * nyata dan pastikan jangkarnya benar-benar tersentuh.
 *
 *   di 400px  suku pilihan harus TEPAT minPx  (baru menyentuh lantai)
 *   di 1440px suku pilihan harus TEPAT maxPx  (baru menyentuh plafon)
 *
 * Kalau B salah, suku pilihan tidak akan mencapai maxPx dan clamp menempel di
 * lantai — dan itu terdeteksi di sini, tidak peduli seberapa konsisten
 * aljabarnya sendiri.
 */
const verifyAgainstAnchors = () => {
  const bad = [];
  for (const c of computed) {
    const at400 = c.A_rem * 16 + c.B_vw * 4.0;
    const at1440 = c.A_rem * 16 + c.B_vw * 14.4;
    if (Math.abs(at400 - c.minPx) > 0.01) bad.push(`${c.name} di 400px: suku=${at400.toFixed(2)} ≠ ${c.minPx}`);
    if (Math.abs(at1440 - c.maxPx) > 0.01) bad.push(`${c.name} di 1440px: suku=${at1440.toFixed(2)} ≠ ${c.maxPx}`);
  }
  return bad;
};

const anchorErrors = verifyAgainstAnchors();

console.log('/* Dihasilkan oleh outputs/audit/type-scale-final.cjs. Jangan diubah tangan. */');
console.log(':root {');
for (const c of computed) {
  console.log(
    `  ${c.name}: clamp(${+c.minRem.toFixed(4)}rem, ${+c.A_rem.toFixed(4)}rem + ${+c.B_vw.toFixed(4)}vw, ${+c.maxRem.toFixed(4)}rem);` +
      ` /* ${c.minPx} → ${c.maxPx}px  ${c.role} */`,
  );
}
console.log('}');

console.log('\n=== px yang dirender di setiap lebar layar ===');
const widths = [320, 390, 400, 768, 1024, 1280, 1440, 1920];
console.log('  lebar  ' + computed.map((c) => c.name.replace('--step-', 's').padEnd(7)).join(''));
for (const vw of widths) {
  console.log(
    '  ' + String(vw).padEnd(7) + computed.map((c) => render(c, vw).toFixed(1).padEnd(7)).join(''),
  );
}

console.log('\n=== setiap langkah harus BERGERAK antara 400px dan 1440px ===');
let stalled = 0;
for (const c of computed) {
  const a = render(c, MIN_VW);
  const b = render(c, MAX_VW);
  const moves = b > a + 0.5;
  if (!moves) stalled++;
  console.log(
    `  ${moves ? 'ok   ' : 'GAGAL'} ${c.name.padEnd(10)} ${a.toFixed(1)}px → ${b.toFixed(1)}px ` +
      `(×${(b / a).toFixed(2)})`,
  );
}

console.log('\n=== rasio antar tingkat (>= 1.06 agar terbedakan mata) ===');
let flat = 0;
for (let i = 1; i < computed.length; i++) {
  const lo = render(computed[i], MIN_VW) / render(computed[i - 1], MIN_VW);
  const hi = render(computed[i], MAX_VW) / render(computed[i - 1], MAX_VW);
  const bad = lo < 1.06 || hi < 1.06;
  if (bad) flat++;
  console.log(
    `  ${bad ? '⚠ ' : '  '}${computed[i - 1].name} → ${computed[i].name}`.padEnd(28) +
      ` 400px ×${lo.toFixed(3)}   1440px ×${hi.toFixed(3)}`,
  );
}

console.log('\n=== jangkar: suku pilihan harus TEPAT menyentuh kedua ujung ===');
if (anchorErrors.length) {
  for (const e of anchorErrors) console.log(`  GAGAL  ${e}`);
  console.log('  → koefisien salah; clamp akan menempel di salah satu ujung di semua lebar.');
} else {
  console.log('  ok     setiap langkah: tepat minPx di 400px, tepat maxPx di 1440px');
}

console.log(
  `\n  kesimpulan: ${stalled} langkah diam, ${flat} pasangan terlalu dekat, ` +
    `${anchorErrors.length} jangkar meleset  →  ` +
    (stalled === 0 && flat === 0 && anchorErrors.length === 0 ? 'SKALA SAH' : 'SKALA BERMASALAH'),
);
if (stalled || flat || anchorErrors.length) process.exit(1);
