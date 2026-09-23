/**
 * Bandingkan perilaku penjaga rute /admin pada dua peluncuran server.
 *
 * Menjalankan `next start` dua kali di dua port dalam satu proses, lalu
 * menanyakan hal yang sama pada masing-masing: apakah /admin/dasbor anonim
 * dialihkan? Kedua server berasal dari direktori build yang SAMA, jadi setiap
 * perbedaan di antara keduanya berasal dari peluncurannya, bukan dari kode.
 *
 * Inilah pembanding yang memisahkan "penjaganya rusak" dari "penjaganya tidak
 * terjangkau" — pertanyaan yang menentukan arah seluruh investigasi.
 *
 * Jalankan dari akar proyek setelah `npm run build`:
 *     node outputs/audit/probe-guard-live.cjs
 *
 * Yang diharapkan: /admin/dasbor -> 307 ke /admin/masuk, /admin/masuk -> 200.
 */
const { spawn } = require('child_process');
const http = require('http');

const NEXT = require.resolve('next/dist/bin/next');

function start(port, extraEnv) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [NEXT, 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
      cwd: process.cwd(),
      env: { ...process.env, ...extraEnv },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    child.stdout.on('data', (d) => {
      out += d;
      if (out.includes('Ready')) resolve(child);
    });
    child.stderr.on('data', (d) => {
      out += d;
    });
    setTimeout(() => reject(new Error('timeout on port ' + port + '\n' + out)), 25000);
  });
}

function probe(port, pathname) {
  return new Promise((resolve) => {
    const req = http.request(
      { host: '127.0.0.1', port, path: pathname, method: 'GET', headers: { Accept: 'text/html' } },
      (res) => {
        res.resume();
        resolve({ status: res.statusCode, location: res.headers.location || null });
      },
    );
    req.on('error', (e) => resolve({ status: 'ERR ' + e.code, location: null }));
    req.end();
  });
}

(async () => {
  const withEnv = await start(3121, {});
  const envA = await probe(3121, '/admin/dasbor');
  console.log('A) plain launch            /admin/dasbor -> ' + envA.status + (envA.location ? '  -> ' + envA.location : ''));
  console.log('   same launch             /admin/masuk  -> ' + (await probe(3121, '/admin/masuk')).status);
  console.log('   same launch             /karya        -> ' + (await probe(3121, '/karya')).status);

  const withSecret = await start(3122, { AUTH_SECRET: 'x'.repeat(64) });
  const envB = await probe(3122, '/admin/dasbor');
  console.log('B) AUTH_SECRET pre-set     /admin/dasbor -> ' + envB.status + (envB.location ? '  -> ' + envB.location : ''));

  withEnv.kill();
  withSecret.kill();
  process.exit(0);
})().catch((e) => {
  console.error('FAILED: ' + e.message);
  process.exit(1);
});
