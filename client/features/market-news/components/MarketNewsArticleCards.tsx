import type { Article } from "@/services/news";
import { cn } from "@/components/shared/uiPrimitives";
import {
  formatArticleTime,
  getArticleDomain,
  getArticleImage,
} from "../lib/marketNewsArticles";
import styles from "../styles/marketNews.module.css";

function ArticleMeta({ article }: { article: Article }) {
  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-[#8f98aa]">
      <span>{article.source}</span>
      <span aria-hidden="true">-</span>
      <span>{getArticleDomain(article.url)}</span>
      <span aria-hidden="true">-</span>
      <time dateTime={article.publishedAt}>{formatArticleTime(article.publishedAt)}</time>
    </p>
  );
}

export function HeroArticleCard({ article }: { article: Article }) {
  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-white/10 bg-[#0d0f12]">
      <a
        href={article.url}
        target="_blank"
        rel="noreferrer"
        className="block text-white no-underline hover:no-underline"
      >
        <img
          src={getArticleImage(article)}
          alt=""
          className={cn("w-full object-cover", styles.heroImage)}
          loading="eager"
        />
        <div className="p-4 sm:p-5">
          <h2 className="text-balance text-2xl font-extrabold leading-tight text-white sm:text-3xl">
            {article.title}
          </h2>
          {article.summary ? (
            <p className="mt-3 line-clamp-2 text-pretty text-[15px] leading-6 text-[#b9c1d0]">
              {article.summary}
            </p>
          ) : null}
          <ArticleMeta article={article} />
        </div>
      </a>
    </article>
  );
}

export function FeatureArticleCard({ article }: { article: Article }) {
  return (
    <article className="min-w-0 rounded-lg border border-white/10 bg-[#0d0f12] transition-colors hover:border-[#00b884]/45">
      <a
        href={article.url}
        target="_blank"
        rel="noreferrer"
        className="grid min-w-0 grid-cols-[6.8rem_minmax(0,1fr)] gap-3 p-3 text-white no-underline hover:no-underline sm:grid-cols-[8.5rem_minmax(0,1fr)]"
      >
        <img
          src={getArticleImage(article)}
          alt=""
          className="h-full min-h-[92px] w-full rounded-md object-cover"
          loading="lazy"
        />
        <div className="min-w-0">
          <h3 className="line-clamp-3 text-base font-extrabold leading-6 text-white">
            {article.title}
          </h3>
          <ArticleMeta article={article} />
        </div>
      </a>
    </article>
  );
}

export function LatestArticleList({
  articles,
  title = "Latest",
}: {
  articles: readonly Article[];
  title?: string;
}) {
  return (
    <section className="min-w-0" aria-label={title}>
      <h2 className="text-xl font-extrabold text-white">{title}</h2>
      <div className="mt-3 divide-y divide-white/10">
        {articles.map((article) => (
          <article key={article.id} className="py-3 first:pt-0">
            <a
              href={article.url}
              target="_blank"
              rel="noreferrer"
              className="group block text-white no-underline hover:no-underline"
            >
              <h3 className="text-balance text-base font-extrabold leading-6 text-white group-hover:text-[#9fe7d0]">
                {article.title}
              </h3>
              <ArticleMeta article={article} />
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}

export function EmptyArticleState({ message }: { message: string }) {
  return (
    <section className="rounded-lg border border-white/10 bg-[#0d0f12] p-6 text-[#b9c1d0]">
      {message}
    </section>
  );
}
