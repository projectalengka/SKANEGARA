import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProgramBySlug, getPrograms } from '@/lib/content';
import { PageHero } from '@/components/ui/PageHero';
import { ui } from '@/data/defaults';

/**
 * A programme detail page.
 *
 * `generateStaticParams` pre-renders one page per published programme at build
 * time, so a visit is a static hit rather than a render. The same content is
 * revalidated on the `program` tag, which is what lets an edit in the dashboard
 * appear here without a redeploy.
 */
export async function generateStaticParams() {
  const programs = await getPrograms();
  return programs.map((program) => ({ slug: program.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const program = await getProgramBySlug(slug);

  if (!program) return { title: 'Program tidak ditemukan' };

  return {
    title: program.name,
    description: program.shortDescription || `Program keahlian ${program.name}.`,
    alternates: { canonical: `/program-keahlian/${program.slug}` },
    openGraph: {
      title: program.name,
      description: program.shortDescription,
      images: program.image ? [{ url: program.image }] : undefined,
    },
  };
}

export const revalidate = 300;

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [program, programs] = await Promise.all([getProgramBySlug(slug), getPrograms()]);

  if (!program) notFound();

  const others = programs.filter((item) => item.slug !== program.slug);

  return (
    <>
      <PageHero
        index="02"
        eyebrow="Program Keahlian"
        title={program.name}
        standfirst={program.shortDescription}
      >
        <div className="relative mt-12 aspect-16/9 overflow-hidden" data-image-reveal>
          <Image
            src={program.image || '/images/program-placeholder.svg'}
            alt={`Program ${program.name}`}
            fill
            sizes="100vw"
            priority
            className="object-cover"
          />
        </div>
      </PageHero>

      <section className="section-y">
        <div className="shell-wide">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-3">
              <h2 className="label text-[var(--color-text-muted)]">Tentang Program</h2>
            </div>
            <div className="lg:col-span-9">
              <p className="prose-body !text-[length:var(--step-2)] !text-[var(--color-text)]">
                {program.description}
              </p>

              {program.features.length > 0 ? (
                <>
                  <h2 className="label mt-14 text-[var(--color-text-muted)]">Kompetensi</h2>
                  <ul className="mt-6 grid gap-x-10 gap-y-4 border-t border-[var(--color-line)] pt-7 sm:grid-cols-2">
                    {program.features.map((feature) => (
                      <li key={feature} className="flex gap-4 text-[var(--color-text-muted)]">
                        <span aria-hidden="true" className="mt-2.5 h-1 w-1 shrink-0 bg-[var(--color-accent)]" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {others.length > 0 ? (
        <section className="border-t border-[var(--color-line)]">
          <div className="shell-wide py-16">
            <h2 className="label text-[var(--color-text-muted)]">Program Lainnya</h2>
            <ul className="mt-8 border-t border-[var(--color-line)]">
              {others.map((item, index) => (
                <li key={item.id} className="border-b border-[var(--color-line)]">
                  <Link
                    href={`/program-keahlian/${item.slug}`}
                    className="group flex items-center justify-between gap-6 py-7"
                  >
                    <span className="flex items-baseline gap-6">
                      <span className="label text-[var(--color-text-muted)]">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="display text-[length:var(--step-4)] transition-transform duration-700 group-hover:translate-x-2">
                        {item.name}
                      </span>
                    </span>
                    <span aria-hidden="true" className="transition-transform duration-700 group-hover:translate-x-1">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <div className="shell-wide pb-20">
        <Link href="/program-keahlian" className="link-line">
          ← {ui.allPrograms}
        </Link>
      </div>
    </>
  );
}
