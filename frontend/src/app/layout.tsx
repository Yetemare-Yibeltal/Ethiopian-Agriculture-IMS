import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';

import { Providers } from '@/providers';
import './globals.css';

// ─── Font Loading ─────────────────────────────────────────
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

// ─── Metadata ─────────────────────────────────────────────
export const metadata: Metadata = {
  title: {
    default: 'AgroEthiopia MIS',
    template: '%s | AgroEthiopia MIS',
  },
  description:
    'Ethiopian Agriculture Management Information System — ' +
    'National platform for farmer registry, aid distribution, ' +
    'and yield monitoring across all 12 regions of Ethiopia.',
  keywords: [
    'Ethiopia',
    'Agriculture',
    'Farmer Registry',
    'NGO',
    'Ministry of Agriculture',
    'Food Security',
    'Yield Monitoring',
    'Aid Distribution',
  ],
  authors: [{ name: 'Yetemare Yibeltal' }],
  creator: 'Yetemare Yibeltal',
  publisher: 'Ethiopian Ministry of Agriculture',
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/icons/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://agroethiopia.gov.et',
    title: 'AgroEthiopia MIS',
    description:
      'National Agriculture Management Information System for Ethiopia',
    siteName: 'AgroEthiopia MIS',
  },
};

// ─── Viewport ─────────────────────────────────────────────
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#060d18',
};

// ─── Root Layout ──────────────────────────────────────────
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`
        ${inter.variable}
        ${spaceGrotesk.variable}
        ${jetbrainsMono.variable}
      `}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="overflow-x-hidden font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
