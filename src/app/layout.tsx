import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ThemeToggle from '../components/ThemeToggle';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500', '600', '700', '800'],
});

const themeScript = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

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
    // suppressHydrationWarning: the theme script below adds the "dark" class before React hydrates.
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        {/* Apply the saved/system theme before first paint to avoid a light-mode flash. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`min-h-screen ${inter.variable} animated-bg transition-colors overflow-hidden`}
        style={{ fontFamily: 'var(--font-inter), Inter, -apple-system, sans-serif' }}
      >
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}
