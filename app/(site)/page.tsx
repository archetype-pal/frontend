import IntroSection from '@/components/content/intro-section';
import ArticleList from '@/components/content/article-list';
import { apiFetch } from '@/lib/api-fetch';
import { readSiteFeatures } from '@/lib/site-features-server';
import Link from 'next/link';

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
  const siteFeatures = await readSiteFeatures();
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
              About the Project
            </p>
            <blockquote
              className="text-2xl md:text-3xl lg:text-4xl leading-snug tracking-tight text-foreground font-light"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              &ldquo;Government as we recognise it today first emerged in Western Europe in the
              twelfth century. One of the cardinal points on which our understanding of this
              development turns is the evidence of charters.&rdquo;
            </blockquote>
            <div className="mt-8 flex items-center justify-center gap-4">
              <span className="block w-12 h-px bg-border" />
              <Link
                href="/about/historical-context"
                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Read more about the historical context
              </Link>
              <span className="block w-12 h-px bg-border" />
            </div>
          </div>
        </div>
      </section>

      {/* ── News & articles ──────────────────────────────────────────── */}
      {hasArticles && (
        <section className="bg-secondary py-20 md:py-24 relative noise-overlay">
          <div className="container relative z-10 mx-auto px-6 md:px-8">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-12 text-center">
              Latest from the Project
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 max-w-5xl mx-auto">
              {showNews && newsArticles.length > 0 && (
                <ArticleList
                  title="News"
                  articles={newsArticles}
                  moreLink="/publications/news"
                  limit={3}
                />
              )}
              {showFeatureArticles && featureArticles.length > 0 && (
                <ArticleList
                  title="Feature Articles"
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
