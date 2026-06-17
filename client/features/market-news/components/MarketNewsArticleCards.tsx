import type { Article } from "@/services/news";
import { cn, fitText } from "@/components/shared/uiPrimitives";
import {
  formatArticleTime,
  getArticleDomain,
  getArticleImage,
  getArticleInvestorCues,
  getSafeArticleHref,
} from "../lib/marketNewsArticles";
import styles from "../styles/marketNews.module.css";

function ArticleMeta({ article }: { article: Article }) {
  const relatedSymbols = article.relatedSymbols?.slice(0, 3) ?? [];
  const domain =
    article.provider === "demo"
      ? "category demo"
      : getArticleDomain(article.url);
  const href = getSafeArticleHref(article.url);
  const external = /^https?:\/\//i.test(href);
  const confidence =
    typeof article.confidence === "number" && Number.isFinite(article.confidence)
      ? article.confidence.toFixed(1)
      : null;
  const investorCues = getArticleInvestorCues(article);

  return (
    <div
      className={cn(
        "mt-2 flex flex-wrap items-center gap-1.5 text-xs font-semibold",
        fitText.subtle,
      )}
    >
      <span>{article.source}</span>
      <span aria-hidden="true">-</span>
      <span>{domain}</span>
      <span aria-hidden="true">-</span>
      <time dateTime={article.publishedAt}>
        {formatArticleTime(article.publishedAt)}
      </time>
      {article.providerLabel ? (
        <span className="rounded-md border border-[var(--fit-color-border-subtle)] bg-white/[0.04] px-1.5 py-0.5 text-[#dce4ff]">
          {article.providerLabel}
        </span>
      ) : null}
      {external ? (
        <span className="rounded-md border border-[var(--fit-color-border-subtle)] bg-white/[0.04] px-1.5 py-0.5 text-[#dce4ff]">
          Open original
        </span>
      ) : null}
      {relatedSymbols.map((symbol) => (
        <span
          key={symbol}
          className="rounded-md border border-[#5367ff]/30 bg-[#5367ff]/10 px-1.5 py-0.5 text-[#dbe4ff]"
        >
          {symbol}
        </span>
      ))}
      {investorCues.map((cue) => (
        <span
          key={cue}
          className="rounded-md border border-[#38d996]/25 bg-[#38d996]/10 px-1.5 py-0.5 text-[#dffbea]"
        >
          {cue}
        </span>
      ))}
      {confidence ? (
        <span className="rounded-md border border-[var(--fit-color-border-subtle)] bg-white/[0.04] px-1.5 py-0.5 text-[#dce4ff]">
          Match {confidence}
        </span>
      ) : null}
    </div>
  );
}

function articleLinkProps(article: Article) {
  const href = getSafeArticleHref(article.url);
  const external = /^https?:\/\//i.test(href);

  return {
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

  const signal = article.relatedSymbols?.[0] ?? article.providerLabel ?? "NEWS";

  return (
    <div
      aria-hidden="true"
      className={cn(styles.marketVisual, className)}
      data-variant="feature"
    >
      <span className={styles.marketVisualLabel}>Market News</span>
      <span className={styles.marketVisualSignal}>{signal}</span>
    </div>
  );
}

export type TopicFeedPagination = {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  loading: boolean;
  onNextPage: () => void;
  onPreviousPage: () => void;
  pageIndex: number;
  pageSize: number;
  totalLoaded: number;
};

export function TopicArticleFeed({
  articles,
  pagination,
  providerWarning,
}: {
  articles: readonly Article[];
  pagination?: TopicFeedPagination;
  providerWarning?: string;
}) {
  const pageNumber = pagination ? pagination.pageIndex + 1 : 1;
  const statusText = `${articles.length} ${
    articles.length === 1 ? "story" : "stories"
  } shown`;

  return (
    <section className={styles.topicFeed} aria-label="Topic stories">
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
          <p className={cn(styles.topicPagerStatus, fitText.subtle)}>
            Page {pageNumber} · {statusText}
          </p>
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
              disabled={!pagination.hasNextPage || pagination.loading}
              onClick={pagination.onNextPage}
            >
              Next page
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
      <p
        className={cn(
          "text-xs font-extrabold uppercase tracking-[0.14em]",
          fitText.label,
        )}
      >
        Empty view
      </p>
      <h2 className="mt-2 text-xl font-extrabold text-white">{title}</h2>
      <p className={cn("mt-2 max-w-[38rem] text-sm leading-6", fitText.body)}>
        {message}
      </p>
      {detail ? (
        <p
          className={cn(
            "mt-3 max-w-[42rem] rounded-lg border border-[var(--fit-color-border-subtle)] bg-white/[0.035] px-3 py-2 text-xs font-semibold leading-5",
            fitText.subtle,
          )}
        >
          {detail}
        </p>
      ) : null}
    </section>
  );
}
