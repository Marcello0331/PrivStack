import type { Metadata } from 'next';
import AppearanceController from '@/components/appearance/AppearanceController';
import Providers from './providers';
import './globals.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'PrivStack - Homelab Dashboard',
  description: 'Self-hosted homelab dashboard',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-bg-dark">
        <Providers>
          <AppearanceController />
          {children}
        </Providers>
      </body>
    </html>
  );
}
