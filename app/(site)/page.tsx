import IntroSection from '@/components/content/intro-section';
import ArticleList from '@/components/content/article-list';
import { apiFetch } from '@/lib/api-fetch';
import { readSiteFeatures } from '@/lib/site-features-server';
import { readModelLabels } from '@/lib/model-labels-server';
import { resolveModelLabel, safeLinkHref, type ModelLabelLocale } from '@/lib/model-labels';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';

async function getPublications(params: { is_news?: boolean; is_featured?: boolean }) {
  const searchParams = new URLSearchParams();
  if (params.is_news) searchParams.append('is_news', 'true');
  if (params.is_featured) searchParams.append('is_featured', 'true');
  const qs = searchParams.toString();
  const path = `/api/v1/media/publications/${qs ? `?${qs}` : ''}`;

  try {
    const res = await apiFetch(path);
    if (!res.ok) return [];
    const data = await res.json();
    return data.results ?? [];
  } catch {
    return [];
  }
}

export default async function Home() {
  const [t, siteFeatures, modelLabels, locale] = await Promise.all([
    getTranslations('landing'),
    readSiteFeatures(),
    readModelLabels(),
    getLocale(),
  ]);
  const getLabel = (key: 'homeQuote' | 'homeQuoteLinkLabel' | 'homeContextUrl') =>
    resolveModelLabel(modelLabels.labels[key], locale as ModelLabelLocale);
  const contextHref = safeLinkHref(getLabel('homeContextUrl'));
  const showNews = siteFeatures.sections.news !== false;
  const showFeatureArticles = siteFeatures.sections.featureArticles !== false;

  const [newsArticles, featureArticles] = await Promise.all([
    showNews ? getPublications({ is_news: true }) : Promise.resolve([]),
    showFeatureArticles ? getPublications({ is_featured: true }) : Promise.resolve([]),
  ]);

  const hasArticles =
    (showNews && newsArticles.length > 0) || (showFeatureArticles && featureArticles.length > 0);

  return (
    <main>
      <IntroSection />

      {/* ── About teaser ─────────────────────────────────────────────── */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-6 md:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-6">
              {t('aboutEyebrow')}
            </p>
            <blockquote
              className="text-2xl md:text-3xl lg:text-4xl leading-snug tracking-tight text-foreground font-light"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {getLabel('homeQuote')}
            </blockquote>
            {contextHref && (
              <div className="mt-8 flex items-center justify-center gap-4">
                <span className="block w-12 h-px bg-border" />
                <Link
                  href={contextHref}
                  className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  {getLabel('homeQuoteLinkLabel')}
                </Link>
                <span className="block w-12 h-px bg-border" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── News & articles ──────────────────────────────────────────── */}
      {hasArticles && (
        <section className="bg-secondary py-20 md:py-24 relative noise-overlay">
          <div className="container relative z-10 mx-auto px-6 md:px-8">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-12 text-center">
              {t('latestEyebrow')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 max-w-5xl mx-auto">
              {showNews && newsArticles.length > 0 && (
                <ArticleList
                  title={t('newsTitle')}
                  articles={newsArticles}
                  moreLink="/publications/news"
                  limit={3}
                />
              )}
              {showFeatureArticles && featureArticles.length > 0 && (
                <ArticleList
                  title={t('featureArticlesTitle')}
                  articles={featureArticles}
                  moreLink="/publications/feature"
                  limit={3}
                />
              )}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
