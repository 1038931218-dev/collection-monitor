import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Collection Manager - Know Which Invoice to Chase Today',
  description: 'Upload your AR Excel/CSV and get today\'s collection priority report in seconds.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
