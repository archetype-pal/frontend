import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { PageBanner } from '@/components/layout/page-banner';

export default async function AccessibilityStatement() {
  const t = await getTranslations('about');

  return (
    <div>
      <PageBanner title={t('accessibilityTitle')} />
      <div className="container mx-auto px-4 py-12">
        <main className="max-w-3xl">
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">{t('accessibility.ourCommitment')}</h2>
            <p className="mb-4">
              The Models of Authority project is committed to making this website accessible to as
              many people as possible. We aim to meet the requirements of the Web Content
              Accessibility Guidelines (WCAG) 2.1 at Level AA where practicable.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">
              {t('accessibility.standardsAndTechnologies')}
            </h2>
            <p className="mb-4">
              This site is built with modern web technologies (HTML5, CSS, JavaScript) and is
              designed to work with current browsers and assistive technologies. We use semantic
              markup, descriptive link text, and appropriate heading structure to support navigation
              and screen readers.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">{t('accessibility.knownLimitations')}</h2>
            <p className="mb-4">
              Some areas of the site (for example, the manuscript image viewer and annotation tools)
              use third-party components that may have accessibility limitations. We continue to
              review and improve these where possible. PDF and image content from external
              repositories may not be fully optimised for accessibility.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">
              {t('accessibility.feedbackAndContact')}
            </h2>
            <p className="mb-4">
              If you have difficulty using any part of this site or have suggestions for
              improvement, please contact us. We will do our best to respond and to make the site
              more accessible where we can.
            </p>
            <p className="mb-4">
              The Models of Authority project is based at the University of Glasgow. You can find
              contact details on the{' '}
              <Link
                href="/about/about-models-of-authority"
                className="text-primary hover:underline"
              >
                {t('accessibility.aboutLinkLabel')}
              </Link>{' '}
              page.
            </p>
          </section>

          <p className="text-muted-foreground text-sm">
            This statement was last updated in February 2026.
          </p>
        </main>
      </div>
    </div>
  );
}
