/**
 * Generates the placeholder imagery the layout is designed against.
 *
 * Why generated rather than stock photography: the brief forbids inventing
 * facts about the school, and a stock photo of strangers is a fabricated claim
 * about who studies there. These are deliberate, neutral, obviously-a-
 * placeholder compositions in the site's own palette — they hold the right
 * aspect ratio, the right tonal weight and the right amount of visual noise, so
 * the composition can be judged honestly. Replacing them is a Cloudinary upload.
 *
 * They are drawn rather than embedded as base64 so the file stays small enough
 * to read and the intent stays legible.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(process.cwd(), 'public', 'images');
mkdirSync(OUT, { recursive: true });

const INK = '#0a0a0a';
const PAPER = '#ffffff';
const WARM = '#f2f2f2';
const ACCENT = '#c8341f';

type Ratios = { w: number; h: number };

/** A single hairline grid on a warm ground, with one accent mark. */
function gridTile({ w, h }: Ratios, seed: number, label: string): string {
  const step = 40;
  const cols = Math.floor(w / step);
  const rows = Math.floor(h / step);
  const lines: string[] = [];

  for (let i = 1; i < cols; i += 1) {
    lines.push(`<line x1="${i * step}" y1="0" x2="${i * step}" y2="${h}" />`);
  }
  for (let i = 1; i < rows; i += 1) {
    lines.push(`<line x1="0" y1="${i * step}" x2="${w}" y2="${i * step}" />`);
  }

  // One accent block, positioned deterministically so the set does not repeat.
  const ax = ((seed * 7) % (cols - 2)) + 1;
  const ay = ((seed * 3) % (rows - 2)) + 1;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${label}">
  <rect width="${w}" height="${h}" fill="${WARM}" />
  <g stroke="${INK}" stroke-opacity="0.08" stroke-width="1">${lines.join('')}</g>
  <rect x="${ax * step}" y="${ay * step}" width="${step * 2}" height="${step}" fill="${ACCENT}" fill-opacity="0.9" />
  <rect x="${step}" y="${h - step * 3}" width="${step * 3}" height="${step}" fill="${INK}" />
  <text x="${step}" y="${step * 1.6}" font-family="monospace" font-size="11" letter-spacing="2" fill="${INK}" fill-opacity="0.45">${label.toUpperCase()}</text>
</svg>`;
}

/** A dark tile: the counterweight used to give the gallery its rhythm. */
function inkTile({ w, h }: Ratios, seed: number, label: string): string {
  const step = 56;
  const shapes: string[] = [];

  for (let i = 0; i < 5; i += 1) {
    const x = ((seed * 13 + i * 37) % (w - step * 2)) + step;
    const y = ((seed * 29 + i * 53) % (h - step * 2)) + step;
    shapes.push(
      `<rect x="${x}" y="${y}" width="${step}" height="${step}" fill="${PAPER}" fill-opacity="${(0.04 + i * 0.015).toFixed(3)}" />`,
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${label}">
  <rect width="${w}" height="${h}" fill="${INK}" />
  ${shapes.join('')}
  <line x1="0" y1="${h * 0.5}" x2="${w}" y2="${h * 0.5}" stroke="${PAPER}" stroke-opacity="0.12" />
  <rect x="${w * 0.12}" y="${h * 0.5 - 2}" width="${w * 0.16}" height="4" fill="${ACCENT}" />
  <text x="${w * 0.12}" y="${h * 0.5 - 24}" font-family="monospace" font-size="11" letter-spacing="2" fill="${PAPER}" fill-opacity="0.5">${label.toUpperCase()}</text>
</svg>`;
}

/** A quiet portrait plate for the student-work exhibition. */
function workPlate({ w, h }: Ratios, seed: number, label: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${label}">
  <rect width="${w}" height="${h}" fill="${PAPER}" />
  <rect x="0" y="0" width="${w}" height="${h}" fill="${WARM}" fill-opacity="0.55" />
  <rect x="${w * 0.18}" y="${h * 0.14}" width="${w * 0.64}" height="${h * 0.52}" fill="none" stroke="${INK}" stroke-opacity="0.25" />
  <rect x="${w * 0.18}" y="${h * 0.14}" width="${w * 0.64}" height="${(h * 0.52 * (0.3 + (seed % 4) * 0.15)).toFixed(0)}" fill="${seed % 2 === 0 ? INK : ACCENT}" fill-opacity="0.85" />
  <line x1="${w * 0.18}" y1="${h * 0.76}" x2="${w * 0.82}" y2="${h * 0.76}" stroke="${INK}" stroke-opacity="0.2" />
  <line x1="${w * 0.18}" y1="${h * 0.82}" x2="${w * 0.6}" y2="${h * 0.82}" stroke="${INK}" stroke-opacity="0.14" />
  <text x="${w * 0.18}" y="${h * 0.92}" font-family="monospace" font-size="10" letter-spacing="2" fill="${INK}" fill-opacity="0.4">${label.toUpperCase()}</text>
</svg>`;
}

const files: Array<[string, string]> = [];

// Hero — a wide, quiet, dark plate. The headline sits on top of it, so it must
// not carry detail that competes with type.
files.push([
  'hero.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1200" width="1920" height="1200" role="img" aria-label="Foto sekolah, menunggu diunggah">
  <defs>
    <linearGradient id="heroGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#161616" />
      <stop offset="55%" stop-color="#0a0a0a" />
      <stop offset="100%" stop-color="#1d1d1d" />
    </linearGradient>
  </defs>
  <rect width="1920" height="1200" fill="url(#heroGrad)" />
  <g stroke="#ffffff" stroke-opacity="0.05" stroke-width="1">
    <line x1="0" y1="300" x2="1920" y2="300" />
    <line x1="0" y1="600" x2="1920" y2="600" />
    <line x1="0" y1="900" x2="1920" y2="900" />
    <line x1="480" y1="0" x2="480" y2="1200" />
    <line x1="960" y1="0" x2="960" y2="1200" />
    <line x1="1440" y1="0" x2="1440" y2="1200" />
  </g>
  <rect x="1440" y="300" width="480" height="300" fill="#c8341f" fill-opacity="0.16" />
  <text x="96" y="1120" font-family="monospace" font-size="16" letter-spacing="6" fill="#ffffff" fill-opacity="0.3">FOTO SEKOLAH — UNGGAH MELALUI DASBOR</text>
</svg>`,
]);

// Programme plates.
files.push(['program-dkv.svg', workPlate({ w: 1200, h: 1500 }, 2, 'Program DKV')]);
files.push(['program-otomotif.svg', inkTile({ w: 1200, h: 1500 }, 3, 'Program Otomotif')]);
files.push(['program-placeholder.svg', gridTile({ w: 1200, h: 1500 }, 5, 'Program')]);

// Gallery — alternating warm and ink, so the asymmetric composition has rhythm.
for (let i = 1; i <= 6; i += 1) {
  const isDark = i % 3 === 0;
  const ratio: Ratios = i % 2 === 0 ? { w: 1200, h: 900 } : { w: 1000, h: 1250 };
  const label = `Galeri ${String(i).padStart(2, '0')}`;
  files.push([
    `gallery-0${i}.svg`,
    isDark ? inkTile(ratio, i, label) : gridTile(ratio, i, label),
  ]);
}

// Student work plates.
for (let i = 1; i <= 6; i += 1) {
  files.push([`karya-0${i}.svg`, workPlate({ w: 1000, h: 1250 }, i, `Karya ${String(i).padStart(2, '0')}`)]);
}

for (const [name, content] of files) {
  writeFileSync(join(OUT, name), content, 'utf8');
}

console.log(`Tulis ${files.length} berkas ke public/images/`);
