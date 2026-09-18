import type { Metadata } from 'next';
import Image from 'next/image';
import { getSections, getStudentWork } from '@/lib/content';
import { PageHero, EmptyState } from '@/components/ui/PageHero';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Karya Siswa',
  description:
    'Karya siswa SMK Jayanegara: poster, branding, ilustrasi, fotografi, tipografi, dan proyek desain komunikasi visual lainnya.',
  alternates: { canonical: '/karya' },
};

export const revalidate = 300;

export default async function WorksPage() {
  const [works, sections] = await Promise.all([getStudentWork(), getSections()]);
  const section = sections.work;

  // Grouped by category so the page reads as a small exhibition with rooms
  // rather than one long shelf. Preserves the order the administrator set.
  const categories = works.reduce<Map<string, typeof works>>((accumulator, work) => {
    const list = accumulator.get(work.category) ?? [];
    list.push(work);
    accumulator.set(work.category, list);
    return accumulator;
  }, new Map());

  return (
    <>
      <PageHero
        index="04"
        eyebrow={section?.eyebrow ?? 'Karya Siswa'}
        title={'Yang mereka\nkerjakan.'}
        standfirst={section?.body}
      />

      <section className="section-y">
        <div className="shell-wide">
          {works.length === 0 ? (
            <EmptyState
              title="Belum ada karya siswa."
              body="Karya yang Anda tambahkan melalui Dasbor akan tampil di halaman ini."
              action={
                <Link href="/admin/masuk" className="btn btn--solid">
                  Masuk ke Dasbor
                  <span className="btn__arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
              }
            />
          ) : (
            <div className="flex flex-col gap-24">
              {[...categories.entries()].map(([category, items]) => (
                <section key={category} aria-label={`Karya ${category}`}>
                  <div className="flex items-baseline justify-between gap-6 border-b border-[var(--color-line)] pb-4">
                    <h2 className="display text-[clamp(1.75rem,5vw,3rem)] leading-none">{category}</h2>
                    <span className="label shrink-0 text-[var(--color-text-muted)]">
                      {String(items.length).padStart(2, '0')} karya
                    </span>
                  </div>

                  <ul className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8">
                    {items.map((work) => (
                      <li key={work.id} className="group">
                        <figure>
                          <div className="relative aspect-4/5 overflow-hidden" data-image-reveal>
                            <Image
                              src={work.image}
                              alt={work.title}
                              fill
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              className="object-cover transition-transform duration-[1.2s] group-hover:scale-[1.03]"
                              style={{ transitionTimingFunction: 'var(--ease-out)' }}
                            />
                          </div>

                          <figcaption className="mt-4 border-t border-[var(--color-line)] pt-4">
                            <p className="display text-[1.25rem]">{work.title}</p>
                            {/* The student's name is only shown when it is
                                actually recorded. An empty line reads as a bug;
                                omitting the row reads as a choice. */}
                            {work.studentName ? (
                              <p className="label mt-2 text-[var(--color-text-muted)]">
                                {work.studentName}
                                {work.year ? ` · ${work.year}` : ''}
                              </p>
                            ) : null}
                            {work.description ? (
                              <p className="mt-3 text-[0.9375rem] text-[var(--color-text-muted)]">
                                {work.description}
                              </p>
                            ) : null}
                          </figcaption>
                        </figure>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
