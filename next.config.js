/** @type {import('next').NextConfig} */

// Load Amplify environment variables if we're in a build environment
if (process.env.NODE_ENV === 'production') {
  try {
    require('./amplify-env.js');
  } catch (e) {
    console.warn('Failed to load amplify-env.js:', e);
  }
}

// Domain configuration
const MAIN_DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || 'protegeresearchsurvey.com';

// Special outcome pages
const OUTCOME_PAGES = [
  'sorry-quota-full',
  'sorry-disqualified',
  'thank-you-completed'
];

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Simplified domain configuration (no subdomains)
  images: {
    domains: [MAIN_DOMAIN, 'localhost'],
  },
    // Handle redirects
  async redirects() {
    // No redirects needed for single-domain architecture
    return [];
  },
  
  // Handle rewrites
  async rewrites() {
    return {
      beforeFiles: [],
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
    NEXT_PUBLIC_SURVEY_SHORT_URL: `https://${MAIN_DOMAIN}/s`,
  },
};

module.exports = nextConfig;