import type { NextConfig } from 'next';

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    serverActions: {
      /**
       * Server Actions reject a request body larger than 1 MB by default —
       * measured in `next/dist/server/app-render/action-handler.js`:
       *
       *     const bodySizeLimitBytes = bodySizeLimit !== defaultBodySizeLimit
       *       ? parse(bodySizeLimit)
       *       : 1024 * 1024 // 1 MB
       *
       * The dashboard's image field accepts up to 8 MB, so every photograph
       * between those two numbers was rejected *before* the action ran. The
       * rejection is thrown by the runtime rather than returned by the action,
       * so the form's error handling never saw it: the upload button stayed on
       * "Mengunggah…" forever with nothing on screen to explain why. Measured
       * 2026-09-24 with a 1,5 MB PNG: HTTP 500 and an unhandled
       * "Body exceeded 1 MB limit."
       *
       * The value here is deliberately *above* `UPLOAD_LIMITS.maxBytes`: the
       * limit counts the whole multipart envelope (boundary, part headers, the
       * filename), not just the file, so a file at exactly 8 MB would still
       * overshoot an 8 MB cap. `tests/upload.test.ts` asserts the relationship
       * so the two cannot drift apart again.
       */
      bodySizeLimit: '9mb',
    },
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/fonts/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default config;
