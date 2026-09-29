import type { Metadata } from 'next';
import './globals.css';
import AnalyticsTracker from '@/components/AnalyticsTracker';

export const metadata: Metadata = {
  title: {
    default: 'Collection Monitor - Know Which Invoice to Chase Today',
    template: '%s | Collection Monitor',
  },
  description: "Upload your AR Excel/CSV and get today's collection priority report in seconds. Free invoice aging analysis for small businesses.",
  keywords: ['invoice aging', 'accounts receivable', 'AR aging', 'collection priority', 'overdue invoice', 'cash flow'],
  authors: [{ name: 'Collection Monitor Team' }],
  creator: 'Collection Monitor',
  publisher: 'Collection Monitor',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://collection-monitor-nine.vercel.app',
    siteName: 'Collection Monitor',
    title: 'Collection Monitor - Know Which Invoice to Chase Today',
    description: "Upload your AR Excel/CSV and get today's collection priority report in seconds.",
    images: [
      {
        url: 'https://collection-monitor-nine.vercel.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Collection Monitor Preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Collection Monitor - Know Which Invoice to Chase Today',
    description: "Upload your AR Excel/CSV and get today's collection priority report in seconds.",
    creator: '@CollectionMonitor',
  },
  alternates: {
    canonical: 'https://collection-monitor-nine.vercel.app',
  },
  category: 'business',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      </head>
      <body>
        <AnalyticsTracker />
        {children}
      </body>
    </html>
  );
}
