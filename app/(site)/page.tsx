import IntroSection from '@/components/content/intro-section';
import ArticleList from '@/components/content/article-list';
import { apiFetch } from '@/lib/api-fetch';
import { readSiteFeatures } from '@/lib/site-features-server';

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

  return (
    <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
      <IntroSection />

      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 my-8">
          {showNews && (
            <ArticleList
              title="News"
              articles={newsArticles}
              moreLink="/publications/news"
              limit={3}
            />
          )}
          {showFeatureArticles && (
            <ArticleList
              title="Feature Articles"
              articles={featureArticles}
              moreLink="/publications/feature"
              limit={3}
            />
          )}
        </div>
      </div>
    </main>
  );
}
