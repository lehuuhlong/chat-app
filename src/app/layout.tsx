import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ThemeToggle from '../components/ThemeToggle';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Messenger — Modern Chat',
  description: 'A beautifully crafted real-time chat application',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`min-h-screen ${inter.variable} animated-bg transition-colors`}
        style={{ fontFamily: 'var(--font-inter), Inter, -apple-system, sans-serif' }}
      >
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}
