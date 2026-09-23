import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getNews, getSections } from '@/lib/content';
import { PageHero, EmptyState } from '@/components/ui/PageHero';
import { formatDateId, truncate } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Berita',
  description:
    'Berita dan informasi terbaru dari SMK Jayanegara Mojokerto — kegiatan sekolah, prestasi, pengumuman, dan informasi PPDB.',
  alternates: { canonical: '/berita' },
};

export const revalidate = 120;

export default async function NewsPage() {
  const [news, sections] = await Promise.all([getNews(), getSections()]);
  const section = sections.news;

  // Grouping by month turns an undifferentiated list into a timeline, which is
  // what a news archive is for: "what happened, and when".
  const groups = news.reduce<Array<{ label: string; items: typeof news }>>((accumulator, item) => {
    const date = new Date(item.publishedAt ?? item.createdAt);
    const label = new Intl.DateTimeFormat('id-ID', {
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    }).format(date);

    const last = accumulator[accumulator.length - 1];
    if (last && last.label === label) {
      last.items.push(item);
    } else {
      accumulator.push({ label, items: [item] });
    }
    return accumulator;
  }, []);

  return (
    <>
      <PageHero
        index="06"
        eyebrow={section?.eyebrow ?? 'Berita'}
        title={'Kabar dari\nsekolah.'}
        standfirst={section?.body}
      />

      <section className="section-y">
        <div className="shell-wide">
          {news.length === 0 ? (
            <EmptyState
              title="Belum ada berita."
              body="Berita yang diterbitkan melalui Dasbor akan muncul di halaman ini secara otomatis."
              action={
                // Same reasoning as the works page: a visitor reading the public
                // news archive is not the administrator, so the empty state must
                // not hand them the admin login. Point at contact instead.
                <Link href="/kontak" className="btn btn--solid">
                  Hubungi Kami
                  <span className="btn__arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
              }
            />
          ) : (
            <div className="flex flex-col gap-20">
              {groups.map((group) => (
                <section key={group.label} aria-label={`Berita ${group.label}`}>
                  <h2 className="label border-b border-[var(--color-line)] pb-4 text-[var(--color-accent)]">
                    {group.label}
                  </h2>

                  <ul className="mt-2">
                    {group.items.map((item) => (
                      <li key={item.id} className="border-b border-[var(--color-line)]">
                        <Link href={`/berita/${item.slug}`} className="group grid gap-6 py-8 lg:grid-cols-12 lg:gap-10">
                          <div className="lg:col-span-4">
                            {item.coverImage ? (
                              <div className="relative aspect-3/2 overflow-hidden" data-image-reveal>
                                <Image
                                  src={item.coverImage}
                                  alt={item.title}
                                  fill
                                  sizes="(max-width: 1024px) 100vw, 33vw"
                                  className="object-cover transition-transform duration-[1.2s] group-hover:scale-[1.03]"
                                  style={{ transitionTimingFunction: 'var(--ease-out)' }}
                                />
                              </div>
                            ) : (
                              <div className="aspect-3/2 bg-[var(--color-paper-warm)]" />
                            )}
                          </div>

                          <div className="lg:col-span-8">
                            <div className="flex items-center gap-4">
                              <span className="label text-[var(--color-accent)]">{item.category}</span>
                              <time
                                dateTime={item.publishedAt ?? item.createdAt}
                                className="label text-[var(--color-text-faint)]"
                              >
                                {formatDateId(item.publishedAt ?? item.createdAt)}
                              </time>
                            </div>

                            <h3 className="display mt-4 text-[length:var(--step-4)] leading-[1.05] transition-colors duration-500 group-hover:text-[var(--color-accent)]">
                              {item.title}
                            </h3>
                            <p className="mt-4 max-w-2xl text-[var(--color-text-muted)]">
                              {truncate(item.excerpt, 200)}
                            </p>
                          </div>
                        </Link>
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
