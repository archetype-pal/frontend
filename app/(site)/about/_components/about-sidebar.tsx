import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { readModelLabels } from '@/lib/model-labels-server';
import { resolveModelLabel, type ModelLabelLocale } from '@/lib/model-labels';

function getLinks(t: Awaited<ReturnType<typeof getTranslations>>, siteTitle: string) {
  return [
    { href: '/about/historical-context', label: t('historicalContext') },
    { href: '/about/about-models-of-authority', label: t('projectTeam') },
    {
      href: '/about/about-models-of-authority',
      label: t('citeDatabase', { siteTitle }),
    },
    { href: '/about/about-models-of-authority', label: t('talksAndPublications') },
    { href: '/about/about-models-of-authority', label: t('acknowledgements') },
    { href: '/about/about-models-of-authority', label: t('privacyPolicy') },
    { href: '/about/accessibility', label: t('accessibilityStatement') },
    { href: '/search/manuscripts', label: t('search') },
    { href: '/about/about-models-of-authority', label: t('about') },
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
        <h2 className="text-xl font-bold mb-4">{t('heading')}</h2>
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
