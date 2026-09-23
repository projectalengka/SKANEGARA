/**
 * Diagnosa: kenapa penjaga rute /admin bisa mati diam-diam.
 *
 * Membuktikan mekanismenya, bukan menyimpulkannya: mereproduksi persis apa yang
 * dilakukan runtime server saat memuat middleware Node, lalu menunjukkan bahwa
 * satu-satunya yang hilang adalah nama berkas yang dicari Next.
 *
 * Jalankan dari akar proyek setelah `npm run build`:
 *     node outputs/audit/probe-proxy-rename.cjs
 *
 * Keluaran yang sehat berakhir dengan "=> CONFIRMED" hanya bila masalahnya ada.
 * Bila `middleware.js` ada dan `proxy.js` tidak, berkas ini justru menunjukkan
 * build sudah lengkap.
 *
 * Konteks lengkap: README.md bagian 12 dan .workbuddy-ai/memory/MEMORY.md.
 */
const fs = require('fs');
const path = require('path');

const distDir = path.join(process.cwd(), '.next');
const FUNCTIONS_CONFIG = 'functions-config-manifest.json';

// Step 1: the registration Next checks first.
const functionsConfig = require(path.join(distDir, 'server', FUNCTIONS_CONFIG));
const registered = Boolean(functionsConfig?.functions?.['/_middleware']);
console.log('1. functions-config declares /_middleware: ' + registered);

// Step 2: the file Next then requires (server/next-server.js:1082 hardcodes this).
const expected = path.join(distDir, 'server', 'middleware.js');
console.log('2. runtime requires: ' + path.relative(process.cwd(), expected));
console.log('   exists: ' + fs.existsSync(expected));

// Step 3: what the build actually produced.
const produced = fs
  .readdirSync(path.join(distDir, 'server'))
  .filter((f) => /^(middleware|proxy)\.js$/.test(f));
console.log('3. build produced: ' + JSON.stringify(produced));

// Step 4: the consequence — require throws MODULE_NOT_FOUND, which the
// surrounding catch deliberately ignores, so the guard silently disappears.
try {
  require(expected);
  console.log('4. require succeeded (unexpected)');
} catch (e) {
  console.log('4. require threw: ' + e.code + ' — swallowed by the catch at next-server.js:1085');
}

console.log('');
console.log(
  registered && !fs.existsSync(expected)
    ? '=> CONFIRMED: registered, but the module Next requires was never written.'
    : '=> not reproduced',
);
