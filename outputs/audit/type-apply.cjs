/* type-apply.cjs — migrate inline font sizes onto the new scale.
 *
 * DRY RUN BY DEFAULT. Pass --write to actually edit.
 * Prints a per-file diff count so the change can be reviewed before it lands.
 *
 * The map below is not mechanical. Where the audit found two sizes within 2%
 * of each other (18.4px vs 20px; 19.2px vs 20px; 21.6px vs 24px), both were
 * collapsed onto the *same* step — that collapse is the point of the exercise.
 * A few deliberately-small sizes stay raw and are listed in KEEP.
 */
const fs = require('fs');
const path = require('path');

const WRITE = process.argv.includes('--write');
const ROOT = path.resolve(__dirname, '../..');

/* Each entry: [file, from, to, why]. `from` must appear verbatim. */
const MAP = [
  /* ── Label level (10–11px) ───────────────────────────────────────────── */
  ['src/components/footer/SiteFooter.tsx', 'text-[0.6875rem]', 'text-[length:var(--step--2)]', 'label'],
  ['src/components/navigation/SiteHeader.tsx', 'text-[0.6875rem]', 'text-[length:var(--step--2)]', 'label'],
  ['src/components/sections/Introduction.tsx', 'text-[0.6875rem]', 'text-[length:var(--step--2)]', 'label'],

  /* ── Meta level (12–13px) ────────────────────────────────────────────── */
  ['src/app/admin/(dasbor)/pengaturan/page.tsx', 'text-[0.75rem]', 'text-[length:var(--step--1)]', 'meta'],
  ['src/app/admin/(dasbor)/dasbor/page.tsx', 'text-[0.8125rem]', 'text-[length:var(--step--1)]', 'meta'],
  ['src/app/admin/masuk/page.tsx', 'text-[0.8125rem]', 'text-[length:var(--step--1)]', 'meta'],
  ['src/components/admin/AdminShell.tsx', 'text-[0.8125rem]', 'text-[length:var(--step--1)]', 'meta'],

  /* ── Body level (14–15px) — the bulk of the site ─────────────────────── */
  ['src/components/admin/FormFields.tsx', 'text-[0.875rem]', 'text-[length:var(--step-0)]', 'body'],
  ['src/components/admin/AdminShell.tsx', 'text-[0.875rem]', 'text-[length:var(--step-0)]', 'body'],
  ['src/components/admin/managers/ProgramManager.tsx', 'text-[0.875rem]', 'text-[length:var(--step-0)]', 'body'],
  ['src/app/admin/(dasbor)/dasbor/page.tsx', 'text-[0.9375rem]', 'text-[length:var(--step-0)]', 'body'],
  ['src/app/admin/(dasbor)/pengaturan/page.tsx', 'text-[0.9375rem]', 'text-[length:var(--step-0)]', 'body'],
  ['src/app/admin/masuk/page.tsx', 'text-[0.9375rem]', 'text-[length:var(--step-0)]', 'body'],
  ['src/app/karya/page.tsx', 'text-[0.9375rem]', 'text-[length:var(--step-0)]', 'body'],
  ['src/components/admin/AdminShell.tsx', 'text-[0.9375rem]', 'text-[length:var(--step-0)]', 'body'],
  ['src/components/admin/managers/EventManager.tsx', 'text-[0.9375rem]', 'text-[length:var(--step-0)]', 'body'],
  ['src/components/admin/managers/GalleryManager.tsx', 'text-[0.9375rem]', 'text-[length:var(--step-0)]', 'body'],
  ['src/components/admin/managers/NewsManager.tsx', 'text-[0.9375rem]', 'text-[length:var(--step-0)]', 'body'],
  ['src/components/admin/managers/ProgramManager.tsx', 'text-[0.9375rem]', 'text-[length:var(--step-0)]', 'body'],
  ['src/components/admin/managers/SchoolProfileForm.tsx', 'text-[0.9375rem]', 'text-[length:var(--step-0)]', 'body'],
  ['src/components/admin/managers/SectionEditor.tsx', 'text-[0.9375rem]', 'text-[length:var(--step-0)]', 'body'],
  ['src/components/sections/ProgramList.tsx', 'text-[0.9375rem]', 'text-[length:var(--step-0)]', 'body'],

  /* ── Lead level (16–18px) — was 1.0625/1.125rem, two near-identical rungs */
  ['src/app/berita/[slug]/page.tsx', 'text-[1.0625rem]', 'text-[length:var(--step-1)]', 'lead'],
  ['src/app/tentang/page.tsx', 'text-[1.125rem]', 'text-[length:var(--step-1)]', 'lead'],

  /* ── Card-title level (18–21px) ───────────────────────────────────────
     1.15rem (18.4px), 1.2rem (19.2px) and 1.25rem (20px) were three separate
     rungs 0.8px apart. All three collapse to --step-2. That is the fix. */
  ['src/components/admin/AdminShell.tsx', 'text-[1.15rem]', 'text-[length:var(--step-2)]', 'collapse 18.4→step-2'],
  ['src/components/navigation/SiteHeader.tsx', 'text-[1.15rem]', 'text-[length:var(--step-2)]', 'collapse 18.4→step-2'],
  ['src/components/sections/GalleryGrid.tsx', 'text-[1.15rem]', 'text-[length:var(--step-2)]', 'collapse 18.4→step-2'],
  ['src/components/admin/AdminShell.tsx', 'text-[1.2rem]', 'text-[length:var(--step-2)]', 'collapse 19.2→step-2'],
  ['src/app/berita/[slug]/page.tsx', '!text-[1.25rem]', '!text-[length:var(--step-2)]', 'collapse 20→step-2'],
  ['src/app/karya/page.tsx', 'text-[1.25rem]', 'text-[length:var(--step-2)]', 'collapse 20→step-2'],
  ['src/app/program-keahlian/[slug]/page.tsx', '!text-[1.25rem]', '!text-[length:var(--step-2)]', 'collapse 20→step-2'],
  ['src/app/tentang/page.tsx', '!text-[1.25rem]', '!text-[length:var(--step-2)]', 'collapse 20→step-2'],
  ['src/components/sections/GalleryGrid.tsx', 'text-[1.25rem]', 'text-[length:var(--step-2)]', 'collapse 20→step-2'],

  /* ── Subhead level (21–25px) ─────────────────────────────────────────
     1.35rem (21.6px) and 1.5rem (24px) were two rungs 2.4px apart — the
     clearest offender in the audit. Both collapse to --step-3. */
  ['src/app/berita/[slug]/page.tsx', 'text-[1.35rem]', 'text-[length:var(--step-3)]', 'collapse 21.6→step-3'],
  ['src/components/admin/AdminShell.tsx', 'text-[1.35rem]', 'text-[length:var(--step-3)]', 'collapse 21.6→step-3'],
  ['src/components/admin/managers/NewsManager.tsx', 'text-[1.35rem]', 'text-[length:var(--step-3)]', 'collapse 21.6→step-3'],
  ['src/components/admin/managers/SchoolProfileForm.tsx', 'text-[1.35rem]', 'text-[length:var(--step-3)]', 'collapse 21.6→step-3'],
  ['src/components/admin/managers/SectionEditor.tsx', 'text-[1.35rem]', 'text-[length:var(--step-3)]', 'collapse 21.6→step-3'],
  ['src/components/sections/Sections.tsx', 'text-[1.35rem]', 'text-[length:var(--step-3)]', 'collapse 21.6→step-3'],
  ['src/app/admin/(dasbor)/dasbor/page.tsx', 'text-[1.5rem]', 'text-[length:var(--step-3)]', 'collapse 24→step-3'],
  ['src/app/kegiatan/page.tsx', 'text-[1.5rem]', 'text-[length:var(--step-3)]', 'collapse 24→step-3'],
  ['src/components/admin/managers/EventManager.tsx', 'text-[1.5rem]', 'text-[length:var(--step-3)]', 'collapse 24→step-3'],
  ['src/components/admin/managers/GalleryManager.tsx', 'text-[1.5rem]', 'text-[length:var(--step-3)]', 'collapse 24→step-3'],
  ['src/components/admin/managers/NewsManager.tsx', 'text-[1.5rem]', 'text-[length:var(--step-3)]', 'collapse 24→step-3'],
  ['src/components/admin/managers/ProgramManager.tsx', 'text-[1.5rem]', 'text-[length:var(--step-3)]', 'collapse 24→step-3'],
  ['src/components/admin/managers/StudentWorkManager.tsx', 'text-[1.5rem]', 'text-[length:var(--step-3)]', 'collapse 24→step-3'],
  ['src/components/sections/Sections.tsx', 'text-[1.5rem]', 'text-[length:var(--step-3)]', 'collapse 24→step-3'],
  ['src/components/ui/PageHero.tsx', 'text-[1.5rem]', 'text-[length:var(--step-3)]', 'collapse 24→step-3'],

  /* ── Fluid clamps, remapped one rung at a time ───────────────────────── */
  ['src/app/berita/page.tsx', 'text-[clamp(1.5rem,4vw,2.5rem)]', 'text-[length:var(--step-4)]', 'card heading'],
  ['src/app/kegiatan/page.tsx', 'text-[clamp(1.5rem,3.5vw,2.25rem)]', 'text-[length:var(--step-4)]', 'card heading'],
  ['src/app/program-keahlian/[slug]/page.tsx', 'text-[clamp(1.5rem,4vw,2.5rem)]', 'text-[length:var(--step-4)]', 'card heading'],
  ['src/components/sections/ProgramList.tsx', 'text-[clamp(1.6rem,5.5vw,3.25rem)]', 'text-[length:var(--step-5)]', 'list heading'],
  ['src/app/karya/page.tsx', 'text-[clamp(1.75rem,5vw,3rem)]', 'text-[length:var(--step-5)]', 'list heading'],
  ['src/components/admin/AdminShell.tsx', 'text-[clamp(1.75rem,5vw,2.75rem)]', 'text-[length:var(--step-5)]', 'list heading'],
  ['src/components/navigation/SiteHeader.tsx', 'text-[clamp(1.75rem,8vw,2.75rem)]', 'text-[length:var(--step-5)]', 'list heading'],
  ['src/components/sections/Sections.tsx', 'text-[clamp(1.75rem,4.5vw,3rem)]', 'text-[length:var(--step-5)]', 'list heading'],
  ['src/app/admin/masuk/page.tsx', 'text-[clamp(2rem,7vw,3rem)]', 'text-[length:var(--step-5)]', 'login heading'],
  ['src/app/tentang/page.tsx', 'text-[clamp(2rem,5vw,3.25rem)]', 'text-[length:var(--step-5)]', 'section heading'],
  ['src/app/kegiatan/page.tsx', 'text-[clamp(2rem,6vw,4.5rem)]', 'text-[length:var(--step-6)]', 'section heading'],
  ['src/app/program-keahlian/page.tsx', 'text-[clamp(2rem,6vw,4.25rem)]', 'text-[length:var(--step-6)]', 'section heading'],
  ['src/app/tentang/page.tsx', 'text-[clamp(2rem,6vw,4.5rem)]', 'text-[length:var(--step-6)]', 'section heading'],
  ['src/app/berita/[slug]/page.tsx', 'text-[clamp(2.25rem,7.5vw,5.5rem)]', 'text-[length:var(--step-7)]', 'article title'],
  ['src/components/sections/GallerySection.tsx', 'text-[clamp(2.25rem,7.5vw,5.5rem)]', 'text-[length:var(--step-7)]', 'page title'],
  ['src/components/sections/Sections.tsx', 'text-[clamp(2.25rem,7.5vw,5.5rem)]', 'text-[length:var(--step-7)]', 'page title'],
  ['src/components/footer/SiteFooter.tsx', 'text-[clamp(2.5rem,9vw,5.5rem)]', 'text-[length:var(--step-7)]', 'closing statement'],
  ['src/components/sections/About.tsx', 'text-[clamp(2.5rem,7vw,5rem)]', 'text-[length:var(--step-7)]', 'statement'],
  ['src/app/error.tsx', 'text-[clamp(2.5rem,10vw,7rem)]', 'text-[length:var(--step-8)]', 'hero'],
  ['src/app/not-found.tsx', 'text-[clamp(2.5rem,11vw,8rem)]', 'text-[length:var(--step-8)]', 'hero'],
  ['src/components/ui/PageHero.tsx', 'text-[clamp(2.5rem,9vw,7rem)]', 'text-[length:var(--step-8)]', 'hero'],
  ['src/components/sections/Introduction.tsx', 'text-[clamp(2.75rem,11vw,8.5rem)]', 'text-[length:var(--step-8)]', 'hero'],
  ['src/components/sections/Sections.tsx', 'text-[clamp(3rem,14vw,11rem)]', 'text-[length:var(--step-8)]', 'hero'],
];

/* Sizes that stay raw, on purpose. */
const KEEP = new Map([
  ['src/styles/global.css:512', '0.5rem — a caption inside a 96px program thumbnail. --step--2 (10px) would overflow the chip.'],
]);

const byFile = new Map();
for (const [file, from, to, why] of MAP) {
  if (!byFile.has(file)) byFile.set(file, []);
  byFile.get(file).push({ from, to, why });
}

let totalHits = 0;
let totalMiss = 0;
const report = [];

for (const [rel, edits] of byFile) {
  const abs = path.join(ROOT, rel);
  let src = fs.readFileSync(abs, 'utf8');
  const before = src;
  let hits = 0;

  for (const { from, to, why } of edits) {
    const parts = src.split(from);
    const n = parts.length - 1;
    if (n === 0) {
      report.push(`  MISS  ${rel}  ${from}  (${why})`);
      totalMiss++;
      continue;
    }
    src = parts.join(to);
    hits += n;
    totalHits += n;
    report.push(`  ok    ${rel}  ${from} → ${to}  ×${n}   (${why})`);
  }

  if (WRITE && src !== before) fs.writeFileSync(abs, src);
}

console.log(`\n=== ${WRITE ? 'DITERAPKAN' : 'DRY RUN'} — ${totalHits} penggantian, ${totalMiss} tidak ketemu ===\n`);
console.log(report.join('\n'));
if (!WRITE) console.log('\n  Jalankan dengan --write untuk menerapkan.');

if (KEEP.size) {
  console.log('\n=== sengaja TIDAK diubah ===');
  for (const [k, v] of KEEP) console.log(`  ${k}\n      ${v}`);
}
