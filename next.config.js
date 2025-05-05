/** @type {import('next').NextConfig} */

// Domain configuration
const MAIN_DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || 'protegeresearchsurvey.com';
const ADMIN_DOMAIN = process.env.NEXT_PUBLIC_ADMIN_DOMAIN || `admin.${MAIN_DOMAIN}`;

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Domain configuration for multi-domain setup
  images: {
    domains: [MAIN_DOMAIN, ADMIN_DOMAIN, 'localhost'],
  },
  
  // Handle redirects
  async redirects() {
    return [
      // Explicitly handle the projects/new route to prevent 404 errors
      {
        source: '/projects/new',
        destination: '/admin/projects/new',
        permanent: false,
        has: [
          {
            type: 'host',
            value: ADMIN_DOMAIN,
          },
        ],
      },
      // Redirect default survey routes to the main domain
      {
        source: '/survey/:projectId/:uid',
        destination: `https://${MAIN_DOMAIN}/survey/:projectId/:uid`,
        permanent: true,
        has: [
          {
            type: 'host',
            value: ADMIN_DOMAIN,
          },
        ],
      },
      // Redirect short links to the main domain
      {
        source: '/s/:projectId/:uid',
        destination: `https://${MAIN_DOMAIN}/s/:projectId/:uid`,
        permanent: true,
        has: [
          {
            type: 'host',
            value: ADMIN_DOMAIN,
          },
        ],
      },
      // Redirect completion pages to the main domain
      {
        source: '/completion/:projectId/:uid',
        destination: `https://${MAIN_DOMAIN}/completion/:projectId/:uid`,
        permanent: true,
        has: [
          {
            type: 'host',
            value: ADMIN_DOMAIN,
          },
        ],
      },
    ];
  },
  
  // Handle rewrites
  async rewrites() {
    return {
      beforeFiles: [
        // Special handling for the admin/projects/new route
        {
          source: '/admin/projects/new',
          destination: '/admin/projects/new',
        },
        // Handle admin routes on the admin subdomain, but don't interfere with static routes
        {
          source: '/:path*',
          destination: '/admin/:path*',
          has: [
            {
              type: 'host',
              value: ADMIN_DOMAIN,
            },
          ],
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  
  // Handle headers for security and caching
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
      {
        // Admin-specific security headers
        source: '/admin/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.amazonaws.com https://ipinfo.io",
          },
        ],
      },
    ];
  },
  
  // Environment configuration
  env: {
    NEXT_PUBLIC_DOMAIN: MAIN_DOMAIN,
    NEXT_PUBLIC_ADMIN_DOMAIN: ADMIN_DOMAIN,
    NEXT_PUBLIC_SURVEY_SHORT_URL: `https://${MAIN_DOMAIN}/s`,
  },
};

module.exports = nextConfig;