import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/utils';

/**
 * robots.txt.
 *
 * The admin area is disallowed, and it is worth being clear about why that is a
 * courtesy rather than a control: `robots.txt` is a request, and a crawler that
 * ignores it will still try `/admin`. The actual protection is the session check
 * in `requireSession`. This rule exists so a search engine does not waste its
 * crawl budget on a login page and surface it in results.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/', '/api/'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/'),
  };
}
