import { getLocale, getTranslations } from 'next-intl/server';
import { PageBanner } from '@/components/layout/page-banner';
import { readModelLabels } from '@/lib/model-labels-server';
import { resolveModelLabel, type ModelLabelLocale } from '@/lib/model-labels';
import { sanitizeHtml } from '@/lib/sanitize-html';

export default async function AccessibilityStatement() {
  const [t, locale, modelLabels] = await Promise.all([
    getTranslations('about'),
    getLocale(),
    readModelLabels(),
  ]);
  const html = resolveModelLabel(modelLabels.labels.pageAccessibility, locale as ModelLabelLocale);

  return (
    <div>
      <PageBanner title={t('accessibilityTitle')} />
      <div className="container mx-auto px-4 py-12">
        <main
          className="max-w-3xl prose"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
        />
      </div>
    </div>
  );
}
