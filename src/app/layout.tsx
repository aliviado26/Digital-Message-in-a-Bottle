import type { Metadata } from 'next';
import { SiteNav } from '@/components/site-nav';
import './globals.css';

export const metadata: Metadata = {
  title: 'Digital Message in a Bottle',
  description: 'Write something. Seal it. Throw it into the ocean. Then let go.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang='en' className='h-full antialiased'>
      <body className='flex min-h-full flex-col bg-bg text-ink'>
        <SiteNav />
        {children}
      </body>
    </html>
  );
}
