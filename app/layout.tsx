import type { Metadata, Viewport } from 'next';
import './globals.css';
import QueryProvider from '@/components/providers/query-provider';

export const metadata: Metadata = {
  title: 'Petta - Pet Health Record & Multi-Clinic System',
  description: 'Centralized digital pet health ledger and appointment booking system',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
