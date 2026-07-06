import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Lora, Cormorant_Garamond } from 'next/font/google';
import { Toaster } from 'sonner';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
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
import { resolveModelLabel, type ModelLabelLocale } from '@/lib/model-labels';

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
// Junicode (psb1558/Junicode-font) — a MUFI font with the medieval Latin
// abbreviations and palaeographic glyphs the charter transcriptions need.
// Variable weight axis is 300–700; not preloaded since it's only pulled in
// where transcription/translation text is rendered.
const junicode = localFont({
  src: [
    { path: './fonts/JunicodeVF-Roman.woff2', style: 'normal' },
    { path: './fonts/JunicodeVF-Italic.woff2', style: 'italic' },
  ],
  variable: '--font-junicode',
  weight: '300 700',
  display: 'swap',
  preload: false,
});

export async function generateMetadata(): Promise<Metadata> {
  const [locale, modelLabels] = await Promise.all([getLocale(), readModelLabels()]);
  const siteTitle = resolveModelLabel(modelLabels.labels.siteTitle, locale as ModelLabelLocale);

  return {
    title: {
      default: siteTitle,
      template: `%s | ${siteTitle}`,
    },
    description:
      'Scottish Charters and the Emergence of Government 1100-1250 – a resource for the study of the contents, script and physical appearance of the corpus of Scottish charters.',
    metadataBase: new URL(env.siteUrl),
    openGraph: {
      type: 'website',
      locale: 'en_GB',
      siteName: siteTitle,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [siteFeaturesConfig, modelLabelsConfig, locale, messages] = await Promise.all([
    readSiteFeatures(),
    readModelLabels(),
    getLocale(),
    getMessages(),
  ]);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} ${cormorant.variable} ${junicode.variable} antialiased`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
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
        </NextIntlClientProvider>
        <Toaster richColors closeButton position="top-center" />
      </body>
    </html>
  );
}
