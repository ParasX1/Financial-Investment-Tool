import type { Article } from "@/services/news";
import {
  EmptyArticleState,
  FeatureArticleCard,
  HeroArticleCard,
  LatestArticleList,
} from "./MarketNewsArticleCards";
import styles from "../styles/marketNews.module.css";

function LoadingSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(16rem,0.8fr)]">
        <div className={`${styles.skeleton} h-[26rem] rounded-lg`} />
        <div className="space-y-3">
          <div className={`${styles.skeleton} h-32 rounded-lg`} />
          <div className={`${styles.skeleton} h-32 rounded-lg`} />
          <div className={`${styles.skeleton} h-32 rounded-lg`} />
        </div>
      </div>
      <div className={`${styles.skeleton} h-[26rem] rounded-lg`} />
    </div>
  );
}

export function MarketNewsArticleLayout({
  articles,
  error,
  loading,
  title,
}: {
  articles: readonly Article[];
  error: string | null;
  loading: boolean;
  title: string;
}) {
  if (loading) return <LoadingSkeleton />;

  if (error) {
    return <EmptyArticleState message={`Failed to load ${title}: ${error}`} />;
  }

  if (!articles.length) {
    return (
      <EmptyArticleState message="No stories matched this view. Try another search term or category." />
    );
  }

  const [hero, ...rest] = articles;
  const featureArticles = rest.slice(0, 3);
  const latestArticles = rest.slice(3);

  return (
    <div className={styles.storyGrid}>
      <div className="min-w-0 space-y-4">
        <HeroArticleCard article={hero!} />
        {featureArticles.length ? (
          <div className={styles.secondaryGrid} aria-label="Featured stories">
            {featureArticles.map((article) => (
              <FeatureArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : null}
      </div>

      <div className={styles.latestPanel}>
        <LatestArticleList articles={latestArticles} />
      </div>
    </div>
  );
}
