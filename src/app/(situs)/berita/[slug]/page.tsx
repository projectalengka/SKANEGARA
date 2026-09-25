import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getNews, getNewsBySlug, getSchoolProfile } from '@/lib/content';
import { absoluteUrl, formatDateId, readingMinutes, siteUrl } from '@/lib/utils';
import { ui } from '@/data/defaults';

/**
 * A news article.
 *
 * A server component, and the article body is rendered as plain text split on
 * blank lines. That is a deliberate choice against a Markdown dependency:
 * the dashboard's editor is plain text, so anything richer would need an editor,
 * a sanitiser and a preview pane — three dependencies and one XSS surface for
 * content that is a few paragraphs of school news.
 *
 * If rich text is ever needed, the seam is here: `renderBody` is the only place
 * that decides how `content` becomes markup.
 */

export const revalidate = 120;

export async function generateStaticParams() {
  const news = await getNews();
  return news.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getNewsBySlug(slug);
  if (!article) return { title: 'Berita tidak ditemukan' };

  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: `/berita/${article.slug}` },
    openGraph: {
      type: 'article',
      title: article.title,
      description: article.excerpt,
      publishedTime: article.publishedAt ?? article.createdAt,
      images: article.coverImage ? [{ url: article.coverImage }] : undefined,
    },
  };
}

/**
 * Splits the stored plain text into blocks.
 *
 * A single newline is a line break within a paragraph; a blank line starts a new
 * paragraph. That matches how someone types into a textarea, which is the whole
 * point — the administrator should not have to learn a markup language to
 * publish a notice.
 */
function renderBody(content: string) {
  const paragraphs = content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return (
      <p className="text-[var(--color-text-muted)]">
        Isi berita ini belum dilengkapi. Lengkapi melalui Dasbor.
      </p>
    );
  }

  return paragraphs.map((block, index) => (
    <p key={`${index}-${block.slice(0, 24)}`} className="mb-6 leading-[1.75] last:mb-0">
      {block.split('\n').map((line, lineIndex) => (
        <span key={`${lineIndex}-${line.slice(0, 16)}`}>
          {lineIndex > 0 ? <br /> : null}
          {line}
        </span>
      ))}
    </p>
  ));
}

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [article, allNews, profile] = await Promise.all([
    getNewsBySlug(slug),
    getNews({ limit: 4 }),
    getSchoolProfile(),
  ]);

  if (!article) notFound();

  const related = allNews.filter((item) => item.slug !== article.slug).slice(0, 3);
  const published = article.publishedAt ?? article.createdAt;

  /**
   * Structured data. This is what lets a search result show the headline, date
   * and publisher instead of a bare link. Emitted unconditionally because every
   * field it carries is real — nothing is fabricated to satisfy the schema.
   */
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.excerpt,
    datePublished: published,
    dateModified: published,
    articleSection: article.category,
    // Schema.org wants an absolute URL. The cover can be either a local seed
    // asset (`/images/…`) or a fully-qualified external URL — and blindly
    // prefixing produced `https://site.comhttps://example.com/…` for every
    // pasted image. `absoluteUrl()` already knows how to join the two.
    image: article.coverImage ? [absoluteUrl(article.coverImage)] : undefined,
    author: { '@type': 'Organization', name: profile.schoolName },
    publisher: {
      '@type': 'EducationalOrganization',
      name: profile.schoolName,
      address: {
        '@type': 'PostalAddress',
        addressLocality: profile.city,
        addressRegion: profile.province,
        addressCountry: 'ID',
      },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${siteUrl()}/berita/${article.slug}` },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Serialised from a plain object built above, never from raw user text.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <article>
        <header className="pt-[calc(var(--nav-h)+3rem)] pb-10">
          <div className="shell-wide">
            <nav aria-label="Breadcrumb" className="label flex items-center gap-3 text-[var(--color-text-muted)]">
              <Link href="/" className="transition-colors hover:text-[var(--color-text)]">
                Beranda
              </Link>
              <span aria-hidden="true">/</span>
              <Link href="/berita" className="transition-colors hover:text-[var(--color-text)]">
                Berita
              </Link>
            </nav>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <span className="label text-[var(--color-accent)]">{article.category}</span>
              <time dateTime={published} className="label text-[var(--color-text-muted)]">
                {formatDateId(published)}
              </time>
              <span className="label text-[var(--color-text-muted)]">
                {readingMinutes(article.content)} menit baca
              </span>
            </div>

            <h1 className="display mt-6 max-w-5xl text-[length:var(--step-7)] leading-[0.92]">
              {article.title}
            </h1>

            {article.excerpt ? (
              <p className="prose-body mt-8 !text-[length:var(--step-2)]">{article.excerpt}</p>
            ) : null}
          </div>
        </header>

        {article.coverImage ? (
          <figure className="shell-wide">
            <div className="relative aspect-16/9 overflow-hidden" data-image-reveal>
              <Image
                src={article.coverImage}
                alt={article.title}
                fill
                sizes="100vw"
                priority
                className="object-cover"
              />
            </div>
          </figure>
        ) : null}

        <div className="shell-wide section-y">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-3">
              <div className="sticky top-[calc(var(--nav-h)+2rem)]">
                <p className="label text-[var(--color-text-muted)]">Diterbitkan</p>
                <p className="mt-2">{formatDateId(published)}</p>
                <Link href="/berita" className="link-line mt-8">
                  ← {ui.allNews}
                </Link>
              </div>
            </div>

            <div className="lg:col-span-8 lg:col-start-5">
              <div className="max-w-2xl text-[length:var(--step-1)] text-[var(--color-text)]">
                {renderBody(article.content)}
              </div>
            </div>
          </div>
        </div>
      </article>

      {related.length > 0 ? (
        <section className="border-t border-[var(--color-line)]" aria-labelledby="judul-terkait">
          <div className="shell-wide py-16">
            <h2 id="judul-terkait" className="label text-[var(--color-text-muted)]">
              Berita Lainnya
            </h2>
            <ul className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-3">
              {related.map((item) => (
                <li key={item.id}>
                  <Link href={`/berita/${item.slug}`} className="group block">
                    <time
                      dateTime={item.publishedAt ?? item.createdAt}
                      className="label text-[var(--color-text-muted)]"
                    >
                      {formatDateId(item.publishedAt ?? item.createdAt)}
                    </time>
                    <h3 className="display mt-3 text-[length:var(--step-3)] leading-[1.15] transition-colors duration-500 group-hover:text-[var(--color-accent)]">
                      {item.title}
                    </h3>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </>
  );
}
