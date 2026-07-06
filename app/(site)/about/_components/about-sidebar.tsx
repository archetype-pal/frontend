import Link from 'next/link';
import { getLocale } from 'next-intl/server';
import { readModelLabels } from '@/lib/model-labels-server';
import { resolveModelLabel, type ModelLabelLocale } from '@/lib/model-labels';

function getLinks(siteTitle: string) {
  return [
    { href: '/about/historical-context', label: 'Historical Context' },
    { href: '/about/about-models-of-authority', label: 'Project Team' },
    {
      href: '/about/about-models-of-authority',
      label: `Citing the ${siteTitle} database`,
    },
    { href: '/about/about-models-of-authority', label: 'Talks and Publications' },
    { href: '/about/about-models-of-authority', label: 'Acknowledgements and Image Rights' },
    { href: '/about/about-models-of-authority', label: 'Privacy and Cookie Policy' },
    { href: '/about/accessibility', label: 'Accessibility Statement' },
    { href: '/search/manuscripts', label: 'Search' },
    { href: '/about/about-models-of-authority', label: 'About' },
  ];
}

export async function AboutSidebar() {
  const [locale, modelLabels] = await Promise.all([getLocale(), readModelLabels()]);
  const siteTitle = resolveModelLabel(modelLabels.labels.siteTitle, locale as ModelLabelLocale);
  const links = getLinks(siteTitle);

  return (
    <aside className="w-full md:w-64">
      <nav className="bg-secondary p-5 rounded-lg border border-border">
        <h2 className="text-xl font-bold mb-4">About</h2>
        <ul className="space-y-2">
          {links.map((link) => (
            <li key={link.label}>
              <Link href={link.href} className="text-primary hover:underline">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
