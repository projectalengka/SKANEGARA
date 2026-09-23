/**
 * Verifikasi akhir pada server yang hidup: rute publik, penjaga admin, dan
 * kebocoran markup.
 */
const BASE = 'http://127.0.0.1:3000';
const pub = ['/', '/tentang', '/program-keahlian', '/berita', '/kegiatan', '/karya', '/galeri', '/kontak', '/privasi'];
const adm = ['/admin/dasbor', '/admin/berita', '/admin/karya', '/admin/profil'];

(async () => {
  let allOk = true;

  console.log('public routes:');
  for (const r of pub) {
    const res = await fetch(BASE + r, { redirect: 'manual' });
    const body = await res.text();
    const marks = (body.match(/\[CONTOH\]/g) || []).length;
    const ok = res.status === 200 && marks > 0;
    if (!ok) allOk = false;
    console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${res.status} ${r.padEnd(20)} CONTOH=${marks}`);
  }

  console.log('admin routes (anonymous):');
  for (const r of adm) {
    const res = await fetch(BASE + r, { redirect: 'manual' });
    const loc = res.headers.get('location') || '';
    const ok = res.status === 307 && loc.includes('/admin/masuk');
    if (!ok) allOk = false;
    console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${res.status} ${r.padEnd(20)} -> ${loc}`);
  }

  const login = await fetch(BASE + '/admin/masuk', { redirect: 'manual' });
  const lbody = await login.text();
  const leaks = /Mode contoh aktif|Mode cadangan|Kembali ke dasbor/.test(lbody);
  console.log(`login page: ${login.status} (expect 200), dashboard leak: ${leaks} (expect false)`);

  console.log(allOk && !leaks ? '\n=> SEMUA TERVERIFIKASI' : '\n=> ADA MASALAH');
})();
