/* type-migrate.cjs — find every inline font-size in src/ and propose a step.
 *
 * Reads the real files (no guessing), prints a per-occurrence table so the
 * change can be reviewed before it is made. Nothing is written.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(ROOT, 'src');

/* The scale we just installed, in px at the two ends of the fluid window. */
const STEPS = [
  ['--step--2', 10, 11],
  ['--step--1', 12, 13],
  ['--step-0', 14, 15],
  ['--step-1', 16, 18],
  ['--step-2', 18, 21],
  ['--step-3', 21, 25],
  ['--step-4', 26, 32],
  ['--step-5', 32, 44],
  ['--step-6', 40, 60],
  ['--step-7', 48, 80],
  ['--step-8', 56, 104],
];

const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts|css)$/.test(e.name)) out.push(p);
  }
  return out;
};

/* Pull the numeric range out of whatever the author wrote. Handles
 * text-[1.5rem], text-[24px], text-[clamp(1.5rem,...)], and bare `font-size`. */
function sizesOf(raw) {
  const nums = [];
  const re = /(-?\d*\.?\d+)(rem|px)/g;
  let m;
  while ((m = re.exec(raw))) {
    const v = parseFloat(m[1]);
    nums.push(m[2] === 'rem' ? v * 16 : v);
  }
  return nums;
}

const nearest = (minPx, maxPx) => {
  let best = null;
  let bestD = Infinity;
  for (const [name, a, b] of STEPS) {
    // Distance between the two intervals.
    const d = Math.max(0, Math.max(a - maxPx, minPx - b));
    // Tie-break toward the step whose midpoint is closer.
    const mid = (a + b) / 2;
    const t = Math.abs(mid - (minPx + maxPx) / 2) * 0.001;
    if (d + t < bestD) {
      bestD = d + t;
      best = name;
    }
  }
  return best;
};

const rows = [];

for (const file of walk(SRC)) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    // Only lines that actually set a text size.
    if (!/(text-\[|font-size\s*:)/.test(line)) return;
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return; // comment
    const px = sizesOf(line);
    if (!px.length) return;
    const min = Math.min(...px);
    const max = Math.max(...px);
    const step = nearest(min, max);
    const snippet = line.trim().replace(/\s+/g, ' ').slice(0, 78);
    rows.push({ rel, line: i + 1, min, max, step, snippet });
  });
}

rows.sort((a, b) => a.min - b.min || a.rel.localeCompare(b.rel));

console.log(`\n=== ${rows.length} ukuran teks inline ===\n`);
let lastStep = null;
for (const r of rows) {
  if (r.step !== lastStep) {
    console.log(`\n  → ${r.step}`);
    lastStep = r.step;
  }
  const range = r.min === r.max ? `${r.min}px` : `${r.min}-${r.max}px`;
  console.log(`     ${range.padEnd(12)} ${r.rel}:${r.line}`);
  console.log(`     ${' '.repeat(12)} ${r.snippet}`);
}

const byStep = {};
for (const r of rows) byStep[r.step] = (byStep[r.step] || 0) + 1;
console.log('\n=== ringkasan ===');
for (const [name] of STEPS) {
  if (byStep[name]) console.log(`  ${name}: ${byStep[name]}`);
}
