import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'THE ENTITY — BLUE STATE',
  description:
    'A realtime computational organism. The Entity is not displaying information — the Entity is the information.',
};

export const viewport: Viewport = {
  themeColor: '#02040A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
