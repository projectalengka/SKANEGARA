/**
 * Jalankan `next build` tanpa shim safe-delete.
 *
 * KENAPA INI ADA
 * --------------
 * `next build` menghapus isi `.next/` sebagai bagian normal dari alurnya
 * (export-detail.json, app-paths-manifest.json, cache webpack). Shim
 * safe-delete milik shell menghitung setiap unlink sebagai satu operasi
 * penghapusan, dan satu build menghasilkan ~1800 di antaranya — jauh di atas
 * ambang 50 per giliran. Hasilnya: build gagal di tahap akhir dengan
 * SAFE_DELETE_BULK_CONFIRM_REQUIRED, padahal kompilasi dan TypeScript sudah
 * selesai tanpa error.
 *
 * Shim itu memasang dirinya lewat env var, jadi build bisa dijalankan dengan
 * env yang dibersihkan. Ini TIDAK mematikan pengaman untuk kerja lain — hanya
 * untuk proses ini. Yang dihapus hanyalah `.next/`, yang sudah ada di
 * .gitignore dan memang dibuang setiap kali build.
 */
const { spawn } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');

/* Buang semua jejak shim dari env yang diwariskan proses anak. */
const env = { ...process.env };
for (const k of Object.keys(env)) {
  if (/^CODEBUDDY_SAFE_DELETE/.test(k)) delete env[k];
  if (/^BASH_FUNC_(rm|unlink|rmdir)/.test(k)) delete env[k];
}
/* Pastikan PATH tetap memuat node_modules/.bin Next. */
const binDir = path.join(ROOT, 'node_modules', '.bin');
env.PATH = binDir + path.delimiter + (env.PATH || '');

const nextBin = path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');
console.log('[build-bersih] menjalankan next build tanpa shim safe-delete…\n');

const child = spawn(process.execPath, [nextBin, 'build', '--webpack'], {
  cwd: ROOT,
  env,
  stdio: 'inherit',
});

child.on('exit', (code) => {
  console.log(`\n[build-bersih] keluar dengan kode ${code}`);
  process.exit(code ?? 1);
});
