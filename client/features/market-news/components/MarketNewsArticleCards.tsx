import type { ReactNode } from "react";
import type { Article } from "@/lib/news/contracts";
import { cn, fitText, fitType } from "@/components/shared/uiPrimitives";
import {
  formatArticleTime,
  getArticleImage,
  getSafeArticleHref,
} from "../lib/marketNewsArticles";
import styles from "../styles/marketNews.module.css";

function ArticleChip({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <span
      className={cn(styles.articleChip, styles.articleChip_ticker)}
      title={title}
    >
      {children}
    </span>
  );
}

function ArticleMeta({ article }: { article: Article }) {
  const relatedSymbols = article.relatedSymbols?.slice(0, 3) ?? [];

  return (
    <div
      className={cn(
        "mt-2 flex flex-wrap items-center gap-1.5",
        fitType.caption,
        fitText.subtle,
      )}
    >
      <span>{article.source}</span>
      <span aria-hidden="true">-</span>
      <time dateTime={article.publishedAt}>
        {formatArticleTime(article.publishedAt)}
      </time>
      {relatedSymbols.map((symbol) => (
        <ArticleChip
          key={symbol}
          title={`Story appears related to ${symbol}`}
        >
          {symbol}
        </ArticleChip>
      ))}
    </div>
  );
}

function articleLinkProps(article: Article) {
  const href = getSafeArticleHref(article.url);
  const external = /^https?:\/\//i.test(href);

  return {
    "aria-label": external
      ? `Read source article in a new tab: ${article.title}`
      : `Read source article: ${article.title}`,
    href,
    rel: external ? "noopener noreferrer" : undefined,
    target: external ? "_blank" : undefined,
  };
}

function ArticleVisual({
  article,
  className,
}: {
  article: Article;
  className?: string;
}) {
  const image = getArticleImage(article);

  if (image) {
    return (
      <img
        src={image}
        alt=""
        className={className}
        width={320}
        height={180}
        loading="lazy"
      />
    );
  }
  return null;
}

export type TopicFeedPagination = {
  canLoadOlder: boolean;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  loading: boolean;
  loadingOlder: boolean;
  olderError: string | null;
  olderNotice?: string | null;
  onLoadOlder: () => void | Promise<void>;
  onNextPage: () => void;
  onPreviousPage: () => void;
  pageIndex: number;
  pageSize: number;
  reachedEnd: boolean;
  totalLoaded: number;
};

export function TopicArticleFeed({
  articles,
  feedStatus,
  pagination,
  providerWarning,
}: {
  articles: readonly Article[];
  feedStatus?: string;
  pagination?: TopicFeedPagination;
  providerWarning?: string;
}) {
  const pageNumber = pagination ? pagination.pageIndex + 1 : 1;
  const statusText =
    feedStatus ??
    `${articles.length} ${articles.length === 1 ? "story" : "stories"} shown`;
  const continuationMode = Boolean(pagination && !pagination.hasNextPage);
  const continuationMessage = !continuationMode
    ? null
    : pagination?.loadingOlder
      ? "Loading older stories..."
      : pagination?.olderError
        ? pagination.olderError
        : pagination?.olderNotice
          ? pagination.olderNotice
          : pagination?.reachedEnd
            ? "No more stories are available from the current providers for this topic."
            : null;
  const nextButtonLabel = !continuationMode
    ? "Next page"
    : pagination?.loadingOlder
      ? "Loading older stories..."
      : pagination?.olderError
        ? "Try loading older stories again"
        : pagination?.reachedEnd
          ? "No older stories"
          : "Load older stories";

  return (
    <section className={styles.topicFeed} aria-label="Topic stories">
      <div className={styles.topicFeedHeader}>
        <p className={styles.topicFeedTitle}>Topic stories</p>
        <p className={cn(styles.topicFeedStatus, fitText.subtle)}>
          {statusText}
        </p>
      </div>

      {providerWarning ? (
        <div className={styles.topicFeedWarning}>{providerWarning}</div>
      ) : null}

      <div className={styles.topicFeedList}>
        {articles.map((article) => (
          <article key={article.id} className={styles.topicArticleRow}>
            <a
              {...articleLinkProps(article)}
              className={cn(
                styles.topicArticleLink,
                getArticleImage(article) ? "" : styles.topicArticleLinkTextOnly,
              )}
            >
              {getArticleImage(article) ? (
                <ArticleVisual
                  article={article}
                  className={styles.topicArticleImage}
                />
              ) : null}
              <div className={styles.topicArticleBody}>
                <h3 className={styles.topicArticleTitle}>{article.title}</h3>
                {article.summary ? (
                  <p className={cn(styles.topicArticleSummary, fitText.body)}>
                    {article.summary}
                  </p>
                ) : null}
                <ArticleMeta article={article} />
              </div>
            </a>
          </article>
        ))}
      </div>

      {pagination ? (
        <nav className={styles.topicPager} aria-label="Story pages">
          <div>
            <p className={cn(styles.topicPagerStatus, fitText.subtle)}>
              Page {pageNumber}
            </p>
            {continuationMessage ? (
              <p
                aria-live="polite"
                className={cn(styles.topicPagerStatus, fitText.subtle)}
                role="status"
              >
                {continuationMessage}
              </p>
            ) : null}
          </div>
          <div className={styles.topicPagerActions}>
            <button
              type="button"
              className={styles.topicPagerButton}
              disabled={!pagination.hasPreviousPage || pagination.loading}
              onClick={pagination.onPreviousPage}
            >
              Previous
            </button>
            <button
              type="button"
              className={styles.topicPagerButton}
              disabled={
                pagination.loading ||
                pagination.loadingOlder ||
                (!pagination.hasNextPage && !pagination.canLoadOlder)
              }
              onClick={() => {
                if (pagination.hasNextPage) {
                  pagination.onNextPage();
                  return;
                }

                void pagination.onLoadOlder();
              }}
            >
              {nextButtonLabel}
            </button>
          </div>
        </nav>
      ) : null}
    </section>
  );
}

export function EmptyArticleState({
  detail,
  message,
  title,
}: {
  detail?: string;
  message: string;
  title: string;
}) {
  return (
    <section className="rounded-xl border border-[var(--fit-color-border-panel)] bg-[var(--fit-color-surface)] p-6">
      <p className={cn(fitType.eyebrow, fitText.label)}>Empty view</p>
      <h2 className={cn("mt-2 text-white", fitType.panelTitle)}>{title}</h2>
      <p className={cn("mt-2 max-w-[38rem]", fitType.bodySm, fitText.body)}>
        {message}
      </p>
      {detail ? (
        <p
          className={cn(
            "mt-3 max-w-[42rem] rounded-lg border border-[var(--fit-color-border-subtle)] bg-white/[0.035] px-3 py-2",
            fitType.caption,
            fitText.subtle,
          )}
        >
          {detail}
        </p>
      ) : null}
    </section>
  );
}
