import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { getPublishedPages } from '@/lib/pages-server';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const aboutPages = await getPublishedPages();

  return (
    <div className="flex flex-col min-h-screen">
      <Header aboutPages={aboutPages} />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
