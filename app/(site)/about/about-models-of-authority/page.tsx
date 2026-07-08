import { getLocale, getTranslations } from 'next-intl/server';
import { PageBanner } from '@/components/layout/page-banner';
import { AboutSidebar } from '../_components/about-sidebar';
import { readModelLabels } from '@/lib/model-labels-server';
import { resolveModelLabel, type ModelLabelLocale } from '@/lib/model-labels';
import { sanitizeHtml } from '@/lib/sanitize-html';

export default async function AboutModelsOfAuthority() {
  const [t, locale, modelLabels] = await Promise.all([
    getTranslations('about'),
    getLocale(),
    readModelLabels(),
  ]);
  const html = resolveModelLabel(
    modelLabels.labels.pageAboutModelsOfAuthority,
    locale as ModelLabelLocale
  );

  return (
    <div>
      <PageBanner title={t('aboutProjectTitle')} />
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row gap-12">
          <main
            className="flex-1 prose max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
          />

          <AboutSidebar />
        </div>
      </div>
    </div>
  );
}
