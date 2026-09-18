import type { MetadataRoute } from 'next';
import { getNews, getPrograms } from '@/lib/content';
import { absoluteUrl } from '@/lib/utils';

/**
 * The sitemap.
 *
 * Built from the same content layer the pages use, so a programme or article
 * added through the dashboard is in the sitemap on the next revalidation without
 * anyone remembering to update a list. A hand-maintained sitemap is a list that
 * goes stale on the first busy week of term.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [news, programs] = await Promise.all([getNews(), getPrograms()]);

  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/tentang'), lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: absoluteUrl('/program-keahlian'), lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: absoluteUrl('/kegiatan'), lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: absoluteUrl('/karya'), lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: absoluteUrl('/galeri'), lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: absoluteUrl('/berita'), lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: absoluteUrl('/kontak'), lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: absoluteUrl('/privasi'), lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ];

  const programRoutes: MetadataRoute.Sitemap = programs.map((program) => ({
    url: absoluteUrl(`/program-keahlian/${program.slug}`),
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  const newsRoutes: MetadataRoute.Sitemap = news.map((item) => ({
    url: absoluteUrl(`/berita/${item.slug}`),
    lastModified: new Date(item.publishedAt ?? item.createdAt),
    changeFrequency: 'yearly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...programRoutes, ...newsRoutes];
}
