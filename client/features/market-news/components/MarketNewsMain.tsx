import * as React from "react";
import { FitPageHeader } from "@/components/shared/FitPageHeader";
import { FitPageShell } from "@/components/shared/FitPageShell";
import {
  FIT_CONTENT_MAX_WIDTH_PX,
  cn,
  fitText,
} from "@/components/shared/uiPrimitives";
import {
  MARKET_NEWS_MARKET_SCOPES,
  MARKET_NEWS_NAV_GROUPS,
} from "../data/marketNewsConfig";
import {
  defaultMarketNewsMarketScopeId,
  defaultMarketNewsTopicId,
  resolveMarketNewsMarketScope,
  resolveMarketNewsTopic,
} from "../lib/marketNewsNavigation";
import {
  buildMarketNewsLensOptions,
  filterArticlesByLens,
} from "../lib/marketNewsLens";
import {
  MARKET_NEWS_TOPIC_PAGE_SIZE,
  clampMarketNewsPageIndex,
  getMarketNewsFetchLimit,
  getMarketNewsPageWindow,
  isMarketNewsPagedTopic,
} from "../lib/marketNewsPagination";
import type {
  MarketNewsLensId,
  MarketNewsMarketScopeId,
  MarketNewsTopicId,
} from "../types";
import { useMarketNewsArticles } from "../hooks/useMarketNewsArticles";
import { useMarketNewsTickerQuotes } from "../hooks/useMarketNewsTickerQuotes";
import { useMarketNewsWatchlist } from "../hooks/useMarketNewsWatchlist";
import { MarketNewsArticleLayout } from "./MarketNewsArticleLayout";
import { MarketNewsCategoryNav } from "./MarketNewsCategoryNav";
import { MarketNewsLensBar } from "./MarketNewsLensBar";
import { MarketNewsRightRail } from "./MarketNewsRightRail";
import { MarketNewsSearchBar } from "./MarketNewsSearchBar";
import { MarketNewsTickerStrip } from "./MarketNewsTickerStrip";
import styles from "../styles/marketNews.module.css";

const ARTICLE_LIMIT = 18;

export function MarketNewsMain({
  onQuoteLookup,
}: {
  onQuoteLookup?: (symbol: string) => void;
}) {
  const [activeTopicId, setActiveTopicId] = React.useState<MarketNewsTopicId>(
    defaultMarketNewsTopicId,
  );
  const [activeMarketScopeId, setActiveMarketScopeId] =
    React.useState<MarketNewsMarketScopeId>(defaultMarketNewsMarketScopeId);
  const [searchDraft, setSearchDraft] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [tickerSymbol, setTickerSymbol] = React.useState("");
  const [activeLensId, setActiveLensId] =
    React.useState<MarketNewsLensId>("all");
  const [storyPageIndex, setStoryPageIndex] = React.useState(0);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [lookupDraft, setLookupDraft] = React.useState("");
  const activeTopic = resolveMarketNewsTopic(activeTopicId);
  const activeMarketScope = resolveMarketNewsMarketScope(activeMarketScopeId);
  const topicFeedMode =
    !searchQuery.trim() &&
    !tickerSymbol &&
    isMarketNewsPagedTopic(activeTopic.id);
  const articleLimit = topicFeedMode
    ? getMarketNewsFetchLimit(storyPageIndex)
    : ARTICLE_LIMIT;
  const [selectedSymbol, setSelectedSymbol] = React.useState(
    activeMarketScope.tickers[0]!.symbol,
  );
  const watchlist = useMarketNewsWatchlist();
  const marketMovers = useMarketNewsTickerQuotes(activeMarketScope.tickers);
  const { articles, error, loading, meta, request } = useMarketNewsArticles({
    limit: articleLimit,
    refreshKey,
    searchQuery,
    tickerSymbol,
    topic: activeTopic,
  });

  const activeSummary = React.useMemo(() => {
    if (meta?.strictCategory === false) {
      return "Showing broad finance headlines from a free external RSS feed while exact category coverage is unavailable.";
    }

    if (searchQuery.trim()) {
      return `Showing market news results for "${searchQuery.trim()}".`;
    }

    if (tickerSymbol) {
      return `Showing ticker-specific headlines for ${tickerSymbol}.`;
    }

    return activeTopic.description;
  }, [
    activeTopic.description,
    activeTopic.label,
    meta?.strictCategory,
    searchQuery,
    tickerSymbol,
  ]);

  const lensOptions = React.useMemo(
    () =>
      buildMarketNewsLensOptions({
        articles,
        watchlistSymbols: watchlist.symbols,
      }),
    [articles, watchlist.symbols],
  );
  const activeLens =
    lensOptions.find((option) => option.id === activeLensId) ?? lensOptions[0]!;
  const displayTitle =
    meta?.strictCategory === false ? "Broad finance headlines" : request.title;
  const displayEyebrow = searchQuery.trim()
    ? "Market search"
    : tickerSymbol
      ? "Ticker news"
      : activeTopic.eyebrow;
  const visibleArticles = React.useMemo(
    () =>
      filterArticlesByLens({
        articles,
        lensId: activeLens.id,
        watchlistSymbols: watchlist.symbols,
      }),
    [activeLens.id, articles, watchlist.symbols],
  );
  const pageWindow = React.useMemo(
    () =>
      topicFeedMode
        ? getMarketNewsPageWindow(visibleArticles, storyPageIndex)
        : null,
    [storyPageIndex, topicFeedMode, visibleArticles],
  );
  const displayedArticles = pageWindow?.items ?? visibleArticles;

  React.useEffect(() => {
    if (!topicFeedMode || loading || !visibleArticles.length) return;

    setStoryPageIndex((pageIndex) =>
      clampMarketNewsPageIndex(pageIndex, visibleArticles.length),
    );
  }, [loading, topicFeedMode, visibleArticles.length]);

  const watchlistArticleCount = React.useMemo(() => {
    const watchlistSet = new Set(
      watchlist.symbols.map((symbol) => symbol.toUpperCase()),
    );

    if (!watchlistSet.size) return 0;

    return displayedArticles.filter((article) =>
      (article.relatedSymbols ?? []).some((symbol) =>
        watchlistSet.has(symbol.toUpperCase()),
      ),
    ).length;
  }, [displayedArticles, watchlist.symbols]);

  const emptyState = React.useMemo(() => {
    if (articles.length && !visibleArticles.length) {
      return {
        title: `No ${activeLens.label.toLowerCase()} stories in this view`,
        message:
          "This filter is strict, so it only shows headlines that match the selected signal. Switch back to All to see every story.",
        detail: activeLens.description,
      };
    }

    if (meta?.provider === "none") {
      return {
        title: "Connect a market news provider",
        message:
          "Enable GDELT_NEWS_ENABLED for no-key development news, or set MARKETAUX_API_KEY for finance-specific production coverage.",
        detail: meta.warnings[0],
      };
    }

    return {
      title: `No ${displayTitle} stories found`,
      message:
        "This view uses a strict category query, so it will stay empty instead of filling with unrelated business headlines.",
      detail: meta?.query ? `Query checked: ${meta.query}` : undefined,
    };
  }, [
    activeLens.description,
    activeLens.label,
    articles.length,
    displayTitle,
    meta,
    visibleArticles.length,
  ]);

  const handleTopicChange = React.useCallback(
    (topicId: MarketNewsTopicId) => {
      setActiveTopicId(topicId);
      setStoryPageIndex(0);
      setSearchQuery("");
      setSearchDraft("");
      setTickerSymbol("");
      setLookupDraft("");
    },
    [],
  );

  const handleSearchSubmit = React.useCallback(() => {
    setStoryPageIndex(0);
    setSearchQuery(searchDraft.trim());
    setTickerSymbol("");
    setLookupDraft("");
  }, [searchDraft]);

  const handleSearchClear = React.useCallback(() => {
    setStoryPageIndex(0);
    setSearchDraft("");
    setSearchQuery("");
    setTickerSymbol("");
  }, []);

  const handleRefresh = React.useCallback(() => {
    setStoryPageIndex(0);
    setRefreshKey((key) => key + 1);
  }, []);

  const handleMarketScopeChange = React.useCallback(
    (scopeId: MarketNewsMarketScopeId) => {
      const nextScope = resolveMarketNewsMarketScope(scopeId);
      const nextSymbol = nextScope.tickers[0]?.symbol ?? "";

      setActiveMarketScopeId(nextScope.id);
      setSelectedSymbol(nextSymbol);
    },
    [],
  );

  const handleQuoteLookup = React.useCallback(
    (value: string) => {
      const symbol = value.trim().toUpperCase();
      if (!symbol) return;

      setSelectedSymbol(symbol);
      setLookupDraft(symbol);
      setStoryPageIndex(0);
      setSearchDraft("");
      setSearchQuery("");
      setTickerSymbol(symbol);
      onQuoteLookup?.(symbol);
    },
    [onQuoteLookup],
  );
  const handleLensChange = React.useCallback((lensId: MarketNewsLensId) => {
    setActiveLensId(lensId);
    setStoryPageIndex(0);
  }, []);
  const handlePreviousPage = React.useCallback(() => {
    setStoryPageIndex((pageIndex) => Math.max(0, pageIndex - 1));
  }, []);
  const handleNextPage = React.useCallback(() => {
    if (!pageWindow?.hasNextPage) return;

    setStoryPageIndex((pageIndex) => pageIndex + 1);
  }, [pageWindow?.hasNextPage]);
  const shownStatusValue =
    topicFeedMode && pageWindow
      ? displayedArticles.length
        ? `${pageWindow.start + 1}-${pageWindow.start + displayedArticles.length}`
        : "0"
      : `${displayedArticles.length}/${articles.length}`;

  return (
    <FitPageShell
      className={styles.shell}
      skipLabel="Skip to market news"
      skipTargetId="market-news-main"
    >
      <main id="market-news-main" tabIndex={-1} className={styles.page}>
        <div
          className={styles.pageInner}
          style={{ maxWidth: FIT_CONTENT_MAX_WIDTH_PX }}
        >
          <FitPageHeader
            title="Market News"
            subtitle="Scan market-moving headlines, check linked tickers, and open the original source before acting."
            subtitleClassName="max-w-[46rem]"
          />

          <section
            className={styles.commandPanel}
            aria-label="Search and news categories"
          >
            <MarketNewsSearchBar
              draft={searchDraft}
              searchQuery={searchQuery}
              onClear={handleSearchClear}
              onDraftChange={setSearchDraft}
              onRefresh={handleRefresh}
              onSubmit={handleSearchSubmit}
            />

            <MarketNewsCategoryNav
              activeTopicId={activeTopic.id}
              groups={MARKET_NEWS_NAV_GROUPS}
              onTopicChange={handleTopicChange}
            />
          </section>

          <section className={styles.marketPanel} aria-label="Market movers">
            <MarketNewsTickerStrip
              loading={marketMovers.loading}
              marketScope={activeMarketScope}
              marketScopes={MARKET_NEWS_MARKET_SCOPES}
              tickers={marketMovers.tickers}
              updatedAt={marketMovers.updatedAt}
              onMarketScopeChange={handleMarketScopeChange}
            />
          </section>

          <section className={styles.storyIntro} aria-live="polite">
            <div className="min-w-0">
              <p className={cn("text-xs font-bold uppercase", fitText.label)}>
                {displayEyebrow}
              </p>
              <div className="min-w-0">
                <h2 className="mt-2 text-balance text-2xl font-extrabold leading-tight text-white">
                  {displayTitle}
                </h2>
                <p
                  className={cn(
                    "mt-2 max-w-[42rem] text-pretty text-[15px] leading-6",
                    fitText.body,
                  )}
                >
                  {activeSummary}
                </p>
              </div>
            </div>

            <dl
              className={styles.statusGrid}
              aria-label="Current market news view"
            >
              <div className={styles.statusCard}>
                <dt>Shown</dt>
                <dd>{shownStatusValue}</dd>
              </div>
              <div className={styles.statusCard}>
                <dt>Watchlist hits</dt>
                <dd>{watchlistArticleCount}</dd>
              </div>
              <div className={styles.statusCard}>
                <dt>{tickerSymbol ? "Ticker news" : "Quote snapshot"}</dt>
                <dd>{tickerSymbol || selectedSymbol}</dd>
              </div>
            </dl>
          </section>

          <MarketNewsLensBar
            activeLensId={activeLens.id}
            options={lensOptions}
            onLensChange={handleLensChange}
          />

          <div className={styles.mainGrid}>
            <section
              className="min-w-0"
              aria-label={`${request.title} stories`}
              aria-busy={loading}
            >
              <MarketNewsArticleLayout
                articles={displayedArticles}
                emptyState={emptyState}
                error={error}
                layout={topicFeedMode ? "topicFeed" : "featureGrid"}
                loading={loading}
                pagination={
                  topicFeedMode && pageWindow
                    ? {
                        hasNextPage: pageWindow.hasNextPage,
                        hasPreviousPage: pageWindow.hasPreviousPage,
                        loading,
                        pageIndex: pageWindow.pageIndex,
                        pageSize: MARKET_NEWS_TOPIC_PAGE_SIZE,
                        totalLoaded: visibleArticles.length,
                        onNextPage: handleNextPage,
                        onPreviousPage: handlePreviousPage,
                      }
                    : undefined
                }
                providerWarning={
                  meta?.provider === "demo" ? undefined : meta?.warnings[0]
                }
                title={displayTitle}
              />
            </section>

            <div className={cn(styles.rightRail, "min-w-0")}>
              <MarketNewsRightRail
                activeTopic={activeTopic}
                articleCount={displayedArticles.length}
                authenticated={watchlist.authenticated}
                lookupDraft={lookupDraft}
                marketScope={activeMarketScope}
                providerLabel={meta?.providerLabel ?? "Pending"}
                providerWarning={meta?.warnings[0]}
                strictCategory={meta?.strictCategory ?? true}
                selectedSymbol={selectedSymbol}
                tickers={marketMovers.tickers}
                watchlistArticleCount={watchlistArticleCount}
                watchlistLoading={watchlist.loading}
                watchlistSymbols={watchlist.symbols}
                onLookupDraftChange={setLookupDraft}
                onQuoteLookup={handleQuoteLookup}
              />
            </div>
          </div>
        </div>
      </main>
    </FitPageShell>
  );
}
