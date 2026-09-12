import type { Metadata, Viewport } from 'next';
import { Oswald, Montserrat } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import ClientWrapper from './components/client-wrapper';
import { CartProvider } from './components/cart-context';

const oswald = Oswald({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-oswald',
  display: 'swap',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-montserrat',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PRIME',
  description: 'An advanced AI-powered Telegram E-Commerce Mini App.',
  openGraph: {
    title: 'PRIME',
    description: 'An advanced AI-powered Telegram E-Commerce Mini App.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${oswald.variable} ${montserrat.variable} dark`}>
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="bg-[#0b0d11] text-[#f3f4f6] min-h-screen antialiased selection:bg-amber-500 selection:text-black">
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
