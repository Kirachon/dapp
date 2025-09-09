import type { NextConfig } from "next";

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
      }
    ];

    // Add HSTS in production
    if (isProduction) {
      baseHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload',
      });
    }

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
