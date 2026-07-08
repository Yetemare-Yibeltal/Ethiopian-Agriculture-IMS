import type { NextConfig } from 'next';

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60,
        },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-static',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60,
        },
      },
    },
    {
      urlPattern: /\/api\/v1\/regions.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'regions-api',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60,
        },
      },
    },
    {
      urlPattern: /\/api\/v1\/dashboard.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'dashboard-api',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 5 * 60,
        },
      },
    },
    {
      urlPattern: /\/api\/v1\/farmers.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'farmers-api',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 10 * 60,
        },
      },
    },
  ],
});

const nextConfig: NextConfig = {
  // ─── Images ────────────────────────────────────────────
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: '*.neon.tech',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // ─── Environment Variables ──────────────────────────────
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:5000/api/v1',
    NEXT_PUBLIC_APP_NAME:
      process.env.NEXT_PUBLIC_APP_NAME || 'AgroEthiopia MIS',
    NEXT_PUBLIC_APP_VERSION:
      process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  },

  // ─── Experimental Features ──────────────────────────────
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      'framer-motion',
    ],
  },

  // ─── Webpack Config ─────────────────────────────────────
  webpack: (config, { isServer }) => {
    // Fix for leaflet in Next.js
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },

  // ─── Headers ────────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
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
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
        ],
      },
    ];
  },

  // ─── Redirects ──────────────────────────────────────────
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/dashboard',
        permanent: true,
      },
    ];
  },

  // ─── Output ─────────────────────────────────────────────
  output: 'standalone',

  // ─── TypeScript ─────────────────────────────────────────
  typescript: {
    ignoreBuildErrors: false,
  },

  // ─── ESLint ─────────────────────────────────────────────
  eslint: {
    ignoreDuringBuilds: false,
  },

  // ─── Compression ────────────────────────────────────────
  compress: true,

  // ─── Power by header ────────────────────────────────────
  poweredByHeader: false,

  // ─── React strict mode ──────────────────────────────────
  reactStrictMode: true,
};

module.exports = withPWA(nextConfig);
