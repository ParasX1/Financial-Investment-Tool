import type { Article } from "@/services/news";
import {
  EmptyArticleState,
  FeatureArticleCard,
  HeroArticleCard,
  LatestArticleList,
  TopicArticleFeed,
  type TopicFeedPagination,
} from "./MarketNewsArticleCards";
import styles from "../styles/marketNews.module.css";

function LoadingSkeleton({
  layout,
}: {
  layout: "featureGrid" | "topicFeed";
}) {
  if (layout === "topicFeed") {
    return (
      <section className={styles.topicFeed} aria-label="Loading topic stories">
        <div className={styles.topicFeedList}>
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className={styles.topicArticleRow}>
              <div className={styles.topicArticleLink}>
                <div
                  className={`${styles.skeleton} ${styles.topicArticleImage}`}
                />
                <div className="min-w-0 space-y-3">
                  <div className={`${styles.skeleton} h-5 w-4/5 rounded`} />
                  <div className={`${styles.skeleton} h-4 w-11/12 rounded`} />
                  <div className={`${styles.skeleton} h-4 w-2/3 rounded`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

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
  emptyState,
  error,
  layout = "featureGrid",
  loading,
  pagination,
  providerWarning,
  title,
}: {
  articles: readonly Article[];
  emptyState: {
    detail?: string;
    message: string;
    title: string;
  };
  error: string | null;
  layout?: "featureGrid" | "topicFeed";
  loading: boolean;
  pagination?: TopicFeedPagination;
  providerWarning?: string;
  title: string;
}) {
  if (loading && !articles.length) return <LoadingSkeleton layout={layout} />;

  if (error) {
    return (
      <EmptyArticleState
        title={`Failed to load ${title}`}
        message={error}
        detail="The page kept your category and ticker selection intact."
      />
    );
  }

  if (!articles.length) {
    return (
      <EmptyArticleState
        title={emptyState.title}
        message={emptyState.message}
        detail={emptyState.detail ?? providerWarning}
      />
    );
  }

  if (layout === "topicFeed") {
    return (
      <TopicArticleFeed
        articles={articles}
        pagination={pagination}
        providerWarning={providerWarning}
      />
    );
  }

  const [hero, ...rest] = articles;
  const featureArticles = rest.slice(0, 3);
  const latestArticles = rest.slice(3);

  if (!latestArticles.length) {
    return (
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
    );
  }

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
        {providerWarning ? (
          <div className="mb-4 rounded-xl border border-[#f6c85f]/30 bg-[#f6c85f]/10 px-4 py-3 text-sm font-semibold leading-6 text-[#ffe7a3]">
            {providerWarning}
          </div>
        ) : null}
        <LatestArticleList articles={latestArticles} />
      </div>
    </div>
  );
}
