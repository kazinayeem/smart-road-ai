import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import { LangProvider } from '@/components/site/i18n';

export const metadata: Metadata = {
  title: { default: 'SmartPothole AI', template: '%s · SmartPothole AI' },
  description: 'Report, track and repair road potholes. On-device AI detection with a role-based civic workflow.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap" />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <LangProvider><AuthProvider>{children}</AuthProvider></LangProvider>
      </body>
    </html>
  );
}
