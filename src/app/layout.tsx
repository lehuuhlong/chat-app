import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import ThemeToggle from '../components/ThemeToggle';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Chat Application',
  description: 'A simple chat application using Next.js and Socket.IO',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`min-h-screen ${geistSans.variable} ${geistMono.variable} bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-zinc-900 dark:to-zinc-800 transition-colors`}
      >
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}
