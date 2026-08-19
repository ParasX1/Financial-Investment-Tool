import type { Article } from "@/lib/news/contracts";
import {
  EmptyArticleState,
  TopicArticleFeed,
  type TopicFeedPagination,
} from "./MarketNewsArticleCards";
import styles from "../styles/marketNews.module.css";

function LoadingSkeleton() {
  return (
    <section className={styles.topicFeed} aria-label="Loading topic stories">
      <div className={styles.topicFeedList}>
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className={styles.topicArticleRow}>
            <div className={styles.topicArticleLink}>
              <div className={`${styles.skeleton} ${styles.topicArticleImage}`} />
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

export function MarketNewsArticleLayout({
  articles,
  emptyState,
  error,
  feedStatus,
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
  feedStatus?: string;
  loading: boolean;
  pagination?: TopicFeedPagination;
  providerWarning?: string;
  title: string;
}) {
  if (loading && !articles.length) return <LoadingSkeleton />;

  if (articles.length) {
    return (
      <TopicArticleFeed
        articles={articles}
        feedStatus={feedStatus}
        pagination={pagination}
        providerWarning={providerWarning}
      />
    );
  }

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

  return null;
}
