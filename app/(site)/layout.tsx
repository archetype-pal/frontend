import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { getMenuHeadings, getPublishedPages } from '@/lib/pages-server';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [pages, menuHeadings] = await Promise.all([getPublishedPages(), getMenuHeadings()]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header pages={pages} menuHeadings={menuHeadings} />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
