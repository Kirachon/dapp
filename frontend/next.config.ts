import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Production optimizations
  output: 'standalone',
  compress: true,
  poweredByHeader: false,

  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/graphql',
  },

  // Image optimization
  images: {
    domains: ['localhost', 'minio', 's3.yourdomain.com'],
    formats: ['image/webp', 'image/avif'],
  },

  // Security headers
  async headers() {
    const isProduction = process.env.NODE_ENV === 'production';

    const baseHeaders = [
      {
        key: 'X-Frame-Options',
        value: 'DENY',
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=()',
      },
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block',
      },
    ];

    // Add HSTS in production
    if (isProduction) {
      baseHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload',
      });
    }

    // Content Security Policy (CSP)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/graphql';
    let apiOrigin: string;
    try {
      apiOrigin = new URL(apiUrl).origin;
    } catch {
      apiOrigin = 'http://localhost:8080';
    }
    const reportUri = `${apiOrigin}/csp-report`;
    const isReportOnly = process.env.CSP_REPORT_ONLY === 'true';

    const cspDirectives = isProduction
      ? [
          "default-src 'self'",
          "base-uri 'self'",
          "object-src 'none'",
          "frame-ancestors 'none'",
          `connect-src 'self' ${apiOrigin}`,
          "img-src 'self' data: blob:",
          "script-src 'self'",
          "style-src 'self'",
          "font-src 'self' data:",
          "form-action 'self'",
          `report-uri ${reportUri}`,
        ].join('; ')
      : [
          "default-src 'self'",
          "base-uri 'self'",
          "object-src 'none'",
          "frame-ancestors 'none'",
          `connect-src 'self' ${apiOrigin} http://localhost:* ws://localhost:*`,
          "img-src 'self' data: blob:",
          "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          "font-src 'self' data:",
          "form-action 'self'",
          `report-uri ${reportUri}`,
        ].join('; ');

    baseHeaders.push({
      key: isReportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy',
      value: cspDirectives,
    });

    return [
      {
        source: '/(.*)',
        headers: baseHeaders,
      },
    ];
  },

  // Health check endpoint
  async rewrites() {
    return [
      {
        source: '/health',
        destination: '/api/health',
      },
    ];
  },
};

export default nextConfig;
