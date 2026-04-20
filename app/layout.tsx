import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Lora, Cormorant_Garamond } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';
import { AuthProvider } from '@/contexts/auth-context';
import { CollectionProvider } from '@/contexts/collection-context';
import { SearchProvider } from '@/contexts/search-context';
import { SiteFeaturesProvider } from '@/contexts/site-features-context';
import { ModelLabelsProvider } from '@/contexts/model-labels-context';
import { AppQueryProvider } from '@/components/providers/query-provider';
import { env } from '@/lib/env';
import { readSiteFeatures } from '@/lib/site-features-server';
import { readModelLabels } from '@/lib/model-labels-server';

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
const lora = Lora({
  subsets: ['latin'],
  variable: '--font-lora',
  display: 'swap',
});
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-cormorant',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Models of Authority',
    template: '%s | Models of Authority',
  },
  description:
    'Scottish Charters and the Emergence of Government 1100-1250 – a resource for the study of the contents, script and physical appearance of the corpus of Scottish charters.',
  metadataBase: new URL(env.siteUrl),
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    siteName: 'Models of Authority',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [siteFeaturesConfig, modelLabelsConfig] = await Promise.all([
    readSiteFeatures(),
    readModelLabels(),
  ]);

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} ${cormorant.variable} antialiased`}
      >
        <AuthProvider>
          <SiteFeaturesProvider initialConfig={siteFeaturesConfig}>
            <ModelLabelsProvider initialConfig={modelLabelsConfig}>
              <AppQueryProvider>
                <CollectionProvider>
                  <SearchProvider>{children}</SearchProvider>
                </CollectionProvider>
              </AppQueryProvider>
            </ModelLabelsProvider>
          </SiteFeaturesProvider>
        </AuthProvider>
        <Toaster richColors closeButton position="top-center" />
      </body>
    </html>
  );
}
