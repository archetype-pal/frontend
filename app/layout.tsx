import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { ThemeProvider } from '@/components/layout/theme-provider'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { AuthProvider } from '@/contexts/auth-context'
import { CollectionProvider } from '@/contexts/collection-context'
import '@recogito/annotorious/dist/annotorious.min.css'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
})
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
})

export const metadata: Metadata = {
  title: 'Models of Authority',
  description: 'Models of Authority',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute='class'
          defaultTheme='light'
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <CollectionProvider>
              <div className='flex flex-col min-h-screen'>
                <Header />
                <div className='flex-1'>{children}</div>
                <Footer />
              </div>
            </CollectionProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
