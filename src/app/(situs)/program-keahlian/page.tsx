import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getPrograms, getSections } from '@/lib/content';
import { PageHero, EmptyState } from '@/components/ui/PageHero';

export const metadata: Metadata = {
  title: 'Program Keahlian',
  description:
    'Program keahlian di SMK Jayanegara: Desain Komunikasi Visual dan Otomotif. Pelajari kompetensi, fasilitas, dan prospek tiap jurusan.',
  alternates: { canonical: '/program-keahlian' },
};

export const revalidate = 300;

export default async function ProgramsPage() {
  const [programs, sections] = await Promise.all([getPrograms(), getSections()]);
  const section = sections.programs;

  return (
    <>
      <PageHero
        index="02"
        eyebrow={section?.eyebrow ?? 'Program Keahlian'}
        title={section?.title?.replace('\n', ' ') ?? 'Program keahlian.'}
        standfirst={section?.body}
      />

      <section className="section-y">
        <div className="shell-wide">
          {programs.length === 0 ? (
            <EmptyState
              title="Belum ada data."
              body="Program keahlian yang Anda tambahkan melalui Dasbor akan muncul di halaman ini."
            />
          ) : (
            <ul className="flex flex-col gap-20 lg:gap-28">
              {programs.map((program, index) => (
                <li key={program.id}>
                  <article className="grid gap-10 lg:grid-cols-12 lg:gap-16">
                    {/* The image alternates sides. Repeating the same alignment
                        down the page would turn a series of articles into a
                        list; alternating makes each one an arrival. */}
                    <div
                      className={`relative aspect-4/5 overflow-hidden lg:col-span-5 ${
                        index % 2 === 1 ? 'lg:order-2' : ''
                      }`}
                      data-image-reveal
                    >
                      <Image
                        src={program.image || '/images/program-placeholder.svg'}
                        alt={`Program ${program.name}`}
                        fill
                        sizes="(max-width: 1024px) 100vw, 40vw"
                        className="object-cover"
                      />
                    </div>

                    <div className="lg:col-span-7">
                      <p className="label text-[var(--color-accent)]" data-reveal>
                        {String(index + 1).padStart(2, '0')}
                      </p>
                      <h2
                        className="display mt-5 text-[length:var(--step-6)] leading-[0.92]"
                        data-reveal
                      >
                        {program.name}
                      </h2>
                      <p className="prose-body mt-6" data-reveal>
                        {program.shortDescription}
                      </p>

                      {program.description ? (
                        <p className="mt-6 max-w-2xl text-[var(--color-text-muted)]" data-reveal>
                          {program.description}
                        </p>
                      ) : null}

                      {program.features.length > 0 ? (
                        <ul className="mt-9 grid gap-x-8 gap-y-3 border-t border-[var(--color-line)] pt-7 sm:grid-cols-2">
                          {program.features.map((feature) => (
                            <li key={feature} className="flex gap-3 text-[var(--color-text-muted)]" data-reveal>
                              <span aria-hidden="true" className="mt-2.5 h-1 w-1 shrink-0 bg-[var(--color-accent)]" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      ) : null}

                      <Link
                        href={`/program-keahlian/${program.slug}`}
                        className="btn btn--ghost mt-10"
                        data-reveal
                      >
                        Pelajari Program
                        <span className="btn__arrow" aria-hidden="true">
                          →
                        </span>
                      </Link>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
