import type { Metadata } from 'next';
import './globals.css';
import QueryProvider from '@/components/providers/query-provider';

export const metadata: Metadata = {
  title: 'Petta - Pet Health Record & Multi-Clinic System',
  description: 'Centralized digital pet health ledger and appointment booking system',
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
