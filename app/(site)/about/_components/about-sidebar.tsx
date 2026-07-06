import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { readModelLabels } from '@/lib/model-labels-server';
import { resolveModelLabel, type ModelLabelLocale } from '@/lib/model-labels';

function getLinks(t: Awaited<ReturnType<typeof getTranslations>>, siteTitle: string) {
  return [
    { href: '/about/historical-context', label: t('sidebar.historicalContext') },
    { href: '/about/about-models-of-authority', label: t('sidebar.projectTeam') },
    {
      href: '/about/about-models-of-authority',
      label: t('sidebar.citeDatabase', { siteTitle }),
    },
    { href: '/about/about-models-of-authority', label: t('sidebar.talksAndPublications') },
    { href: '/about/about-models-of-authority', label: t('sidebar.acknowledgements') },
    { href: '/about/about-models-of-authority', label: t('sidebar.privacyPolicy') },
    { href: '/about/accessibility', label: t('sidebar.accessibilityStatement') },
    { href: '/search/manuscripts', label: t('sidebar.search') },
    { href: '/about/about-models-of-authority', label: t('sidebar.about') },
  ];
}

export async function AboutSidebar() {
  const [locale, modelLabels, t] = await Promise.all([
    getLocale(),
    readModelLabels(),
    getTranslations('about'),
  ]);
  const siteTitle = resolveModelLabel(modelLabels.labels.siteTitle, locale as ModelLabelLocale);
  const links = getLinks(t, siteTitle);

  return (
    <aside className="w-full md:w-64">
      <nav className="bg-secondary p-5 rounded-lg border border-border">
        <h2 className="text-xl font-bold mb-4">{t('sidebar.heading')}</h2>
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
