import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Toaster } from 'sonner';
import './globals.css';
import { AuthProvider } from '@/contexts/auth-context';
import { CollectionProvider } from '@/contexts/collection-context';
import { SearchProvider } from '@/contexts/search-context';
import { SiteFeaturesProvider } from '@/contexts/site-features-context';
import { AppQueryProvider } from '@/components/providers/query-provider';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: {
    default: 'Models of Authority',
    template: '%s | Models of Authority',
  },
  description:
    'Scottish Charters and the Emergence of Government 1100-1250 – a resource for the study of the contents, script and physical appearance of the corpus of Scottish charters.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://archetype.gla.ac.uk'),
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    siteName: 'Models of Authority',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <SiteFeaturesProvider>
            <AppQueryProvider>
              <CollectionProvider>
                <SearchProvider>{children}</SearchProvider>
              </CollectionProvider>
            </AppQueryProvider>
          </SiteFeaturesProvider>
        </AuthProvider>
        <Toaster richColors closeButton position="top-center" />
      </body>
    </html>
  );
}
