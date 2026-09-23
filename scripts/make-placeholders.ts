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

/**
 * Arc composition — a set of concentric quarter-arcs radiating from one corner.
 *
 * Added because the original three generators all reduce to rectangles. Four
 * plates built from nothing but axis-aligned boxes start to look like one
 * drawing repeated, which reads as a rendering bug rather than a design. Curves
 * give the news and events pages a different visual signature from the gallery.
 */
function arcPlate({ w, h }: Ratios, seed: number, label: string): string {
  const bands: string[] = [];
  const count = 5 + (seed % 3);
  const corner = seed % 4;

  // Which corner the arcs radiate from, so the set does not repeat.
  const cx = corner === 0 || corner === 3 ? 0 : w;
  const cy = corner < 2 ? 0 : h;

  for (let i = 0; i < count; i += 1) {
    const radius = ((i + 1) / count) * Math.max(w, h) * 0.95;
    const isAccent = i === Math.floor(count / 2);
    bands.push(
      `<circle cx="${cx}" cy="${cy}" r="${radius.toFixed(0)}" fill="none" ` +
        `stroke="${isAccent ? ACCENT : INK}" stroke-opacity="${isAccent ? 0.85 : (0.06 + i * 0.02).toFixed(3)}" ` +
        `stroke-width="${isAccent ? 10 : 1}" />`,
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${label}">
  <rect width="${w}" height="${h}" fill="${WARM}" />
  ${bands.join('')}
  <rect x="${w * 0.08}" y="${h - h * 0.09}" width="${w * 0.84}" height="1" fill="${INK}" fill-opacity="0.2" />
  <text x="${w * 0.08}" y="${h - h * 0.04}" font-family="monospace" font-size="11" letter-spacing="2" fill="${INK}" fill-opacity="0.45">${label.toUpperCase()}</text>
</svg>`;
}

/**
 * Diagonal composition — a stack of tilted bands across an ink ground.
 *
 * The third distinct signature. Alternating band weight plus one accent gives
 * the events page a sense of sequence (one after another) that neither a grid
 * nor an arc conveys.
 */
function diagonalPlate({ w, h }: Ratios, seed: number, label: string): string {
  const bands: string[] = [];
  const count = 6;
  const tilt = 18 + (seed % 3) * 6;
  const thick = h / count;

  for (let i = 0; i < count; i += 1) {
    const y = i * thick;
    const isAccent = i === (seed % count);
    bands.push(
      `<rect x="${-w * 0.2}" y="${y.toFixed(0)}" width="${w * 1.4}" height="${(thick * 0.62).toFixed(0)}" ` +
        `transform="rotate(${tilt} ${w / 2} ${h / 2})" ` +
        `fill="${isAccent ? ACCENT : PAPER}" fill-opacity="${isAccent ? 0.9 : (0.04 + i * 0.012).toFixed(3)}" />`,
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${label}">
  <rect width="${w}" height="${h}" fill="${INK}" />
  ${bands.join('')}
  <text x="${w * 0.08}" y="${h * 0.94}" font-family="monospace" font-size="11" letter-spacing="2" fill="${PAPER}" fill-opacity="0.5">${label.toUpperCase()}</text>
</svg>`;
}

/**
 * Dot-field composition — a halftone-style grid of circles whose radius ramps
 * across the plate. The one generator with no straight line in it at all.
 */
function dotPlate({ w, h }: Ratios, seed: number, label: string): string {
  const step = 40;
  const cols = Math.floor(w / step);
  const rows = Math.floor(h / step);
  const dots: string[] = [];

  for (let col = 0; col < cols; col += 1) {
    for (let row = 0; row < rows; row += 1) {
      // Radial ramp from an off-centre origin, so the density has direction.
      const dx = (col - cols * (0.2 + (seed % 3) * 0.3)) / cols;
      const dy = (row - rows * 0.5) / rows;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const radius = Math.max(0, 9 * (1 - distance * 1.4));
      if (radius < 0.6) continue;

      const isAccent = radius > 7.4;
      dots.push(
        `<circle cx="${col * step + step / 2}" cy="${row * step + step / 2}" r="${radius.toFixed(1)}" ` +
          `fill="${isAccent ? ACCENT : INK}" fill-opacity="${isAccent ? 0.9 : 0.3}" />`,
      );
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${label}">
  <rect width="${w}" height="${h}" fill="${WARM}" />
  ${dots.join('')}
  <text x="${w * 0.06}" y="${h * 0.95}" font-family="monospace" font-size="11" letter-spacing="2" fill="${INK}" fill-opacity="0.5">${label.toUpperCase()}</text>
</svg>`;
}

/**
 * Frame composition — a nested set of rectangles receding to a vanishing
 * point. Reads as "depth" or "a place", which is what an event or a news
 * article about a location wants.
 */
function framePlate({ w, h }: Ratios, seed: number, label: string): string {
  const frames: string[] = [];
  const count = 7;
  const tilt = (seed % 5) - 2;

  for (let i = 0; i < count; i += 1) {
    const inset = i * 0.055;
    const isAccent = i === 1;
    frames.push(
      `<rect x="${(w * inset).toFixed(1)}" y="${(h * inset).toFixed(1)}" ` +
        `width="${(w * (1 - inset * 2)).toFixed(1)}" height="${(h * (1 - inset * 2)).toFixed(1)}" ` +
        `fill="none" stroke="${isAccent ? ACCENT : INK}" ` +
        `stroke-opacity="${isAccent ? 0.8 : (0.32 - i * 0.035).toFixed(3)}" ` +
        `stroke-width="${isAccent ? 3 : 1}" transform="rotate(${tilt} ${w / 2} ${h / 2})" />`,
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${label}">
  <rect width="${w}" height="${h}" fill="${PAPER}" />
  <rect width="${w}" height="${h}" fill="${WARM}" fill-opacity="0.7" />
  ${frames.join('')}
  <text x="${w * 0.06}" y="${h * 0.95}" font-family="monospace" font-size="11" letter-spacing="2" fill="${INK}" fill-opacity="0.45">${label.toUpperCase()}</text>
</svg>`;
}

/** The generators, cycled so no two adjacent plates share a composition. */
const GENERATORS = [gridTile, inkTile, arcPlate, diagonalPlate, dotPlate, framePlate] as const;

/** Picks a generator by index, wrapping — used where variety is the point. */
function variety(index: number): (typeof GENERATORS)[number] {
  return GENERATORS[index % GENERATORS.length]!;
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

// Gallery — wide and tall plates cycled through every composition, so the
// asymmetric mosaic has genuine variety rather than one drawing six times.
for (let i = 1; i <= 8; i += 1) {
  const ratio: Ratios = i % 2 === 0 ? { w: 1200, h: 900 } : { w: 1000, h: 1250 };
  const label = `Galeri ${String(i).padStart(2, '0')}`;
  files.push([`galeri-0${i}.svg`, variety(i - 1)(ratio, i, label)]);
}

// The gallery names the seed data already points at. Kept as re-exports of the
// same drawings so both naming schemes resolve and neither can 404.
for (let i = 1; i <= 6; i += 1) {
  const ratio: Ratios = i % 2 === 0 ? { w: 1200, h: 900 } : { w: 1000, h: 1250 };
  const label = `Galeri ${String(i).padStart(2, '0')}`;
  files.push([`gallery-0${i}.svg`, variety(i - 1)(ratio, i, label)]);
}

// Student work plates — the same plate style throughout, because an exhibition
// wants consistency. The variation comes from the seed, not the composition.
for (let i = 1; i <= 6; i += 1) {
  files.push([`karya-0${i}.svg`, workPlate({ w: 1000, h: 1250 }, i, `Karya ${String(i).padStart(2, '0')}`)]);
}

// News covers — landscape, and specifically the quieter compositions, because a
// headline sits over these in the list and archive views.
const newsPlates = [arcPlate, framePlate, dotPlate, gridTile] as const;
for (let i = 1; i <= 4; i += 1) {
  const generator = newsPlates[(i - 1) % newsPlates.length]!;
  files.push([`berita-0${i}.svg`, generator({ w: 1600, h: 900 }, i + 10, `Berita ${String(i).padStart(2, '0')}`)]);
}

// Event plates — portrait, since the events page presents them as cards.
const eventPlates = [diagonalPlate, arcPlate, dotPlate, framePlate] as const;
for (let i = 1; i <= 4; i += 1) {
  const generator = eventPlates[(i - 1) % eventPlates.length]!;
  files.push([`kegiatan-0${i}.svg`, generator({ w: 1200, h: 1500 }, i + 20, `Kegiatan ${String(i).padStart(2, '0')}`)]);
}

for (const [name, content] of files) {
  writeFileSync(join(OUT, name), content, 'utf8');
}

console.log(`Tulis ${files.length} berkas ke public/images/`);
