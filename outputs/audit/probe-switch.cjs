// Read the switch out of the *built* server bundle and execute it, so we test
// what the running process actually does rather than what the source says.
const fs = require('fs');
const path = require('path');

const chunkDir = path.join(__dirname, '..', '..', '.next', 'server', 'chunks');
const files = fs.readdirSync(chunkDir).filter((f) => f.endsWith('.js'));
console.log('scanning ' + files.length + ' server chunks');

let found = 0;
for (const f of files) {
  const src = fs.readFileSync(path.join(chunkDir, f), 'utf8');
  if (!src.includes('SAMPLE_DATA')) continue;
  found++;
  console.log('\n=== ' + f + ' contains SAMPLE_DATA ===');
  // print the surrounding context of every occurrence
  let i = -1;
  while ((i = src.indexOf('SAMPLE_DATA', i + 1)) !== -1) {
    const start = Math.max(0, i - 220);
    const end = Math.min(src.length, i + 160);
    console.log('--- occurrence at ' + i + ' ---');
    console.log(src.slice(start, end).replace(/\n/g, '\\n'));
  }
}
if (found === 0) console.log('NO chunk contains SAMPLE_DATA — the switch is absent from the build');
