import * as React from "react";
import { FitPageHeader } from "@/components/shared/FitPageHeader";
import { FitPageShell } from "@/components/shared/FitPageShell";
import { cn } from "@/components/shared/uiPrimitives";
import {
  MARKET_NEWS_MARKET_SCOPES,
  MARKET_NEWS_NAV_GROUPS,
} from "../data/marketNewsConfig";
import {
  buildMarketNewsLensOptions,
  filterArticlesByLens,
} from "../lib/marketNewsLens";
import { buildMarketNewsDisplayState } from "../lib/marketNewsDisplayState";
import { redactMarketNewsTickerFallback } from "../lib/marketNewsDynamicTickers";
import {
  MARKET_NEWS_TOPIC_PAGE_SIZE,
  getMarketNewsFetchLimit,
  getMarketNewsPageWindow,
} from "../lib/marketNewsPagination";
import { buildMarketNewsRailSummary } from "../lib/marketNewsRailSummary";
import {
  MARKET_NEWS_SORT_OPTIONS,
  sortMarketNewsArticles,
} from "../lib/marketNewsSort";
import {
  formatMarketNewsShownStatus,
} from "../lib/marketNewsStatus";
import { useMarketNewsArticles } from "../hooks/useMarketNewsArticles";
import { useMarketNewsController } from "../hooks/useMarketNewsController";
import {
  useMarketNewsTickerQuote,
  useMarketNewsTickerQuotes,
} from "../hooks/useMarketNewsTickerQuotes";
import { useMarketNewsWatchlist } from "../hooks/useMarketNewsWatchlist";
import { MarketNewsArticleLayout } from "./MarketNewsArticleLayout";
import { MarketNewsCategoryNav } from "./MarketNewsCategoryNav";
import { MarketNewsLensBar } from "./MarketNewsLensBar";
import { MarketNewsRightRail } from "./MarketNewsRightRail";
import { MarketNewsScanOrderBar } from "./MarketNewsScanOrderBar";
import { MarketNewsSearchBar } from "./MarketNewsSearchBar";
import { MarketNewsTickerStrip } from "./MarketNewsTickerStrip";
import { MarketNewsViewConsole } from "./MarketNewsViewConsole";
import styles from "../styles/marketNews.module.css";

const MARKET_NEWS_CONTENT_MAX_WIDTH_PX = 1920;

export function MarketNewsMain({
  onQuoteLookup,
}: {
  onQuoteLookup?: (symbol: string) => void;
}) {
  const controller = useMarketNewsController({ onQuoteLookup });
  const {
    activeLensId,
    activeMarketScope,
    activeSortId,
    activeTopic,
    clampStoryPageToCount,
    handleLensChange,
    handleMarketScopeChange,
    handleNextPage,
    handlePreviousPage,
    handleQuoteReferenceChange,
    handleRefresh,
    handleSearchClear,
    handleSearchSubmit,
    handleSortChange,
    handleTickerNewsRequest,
    handleTopicChange,
    lookupDraft,
    quoteReferenceVisible,
    refreshKey,
    resetEmptyLens,
    routeReady,
    searchDraft,
    searchQuery,
    selectedSymbol,
    setLookupDraft,
    setSearchDraft,
    storyPageIndex,
    tickerSymbol,
  } = controller;

  const articleLimit = getMarketNewsFetchLimit(storyPageIndex);
  const watchlist = useMarketNewsWatchlist();
  const marketMovers = useMarketNewsTickerQuotes(
    activeMarketScope,
    watchlist.symbols,
  );
  const selectedScopeTicker = marketMovers.tickers.find(
    (ticker) => ticker.symbol === selectedSymbol,
  );
  const selectedLookupSeed = React.useMemo(() => {
    if (selectedScopeTicker || !selectedSymbol) return null;

    return {
      symbol: selectedSymbol,
      label: "Lookup selected",
      value: "Quote unavailable",
      change: "No live data",
      tone: "neutral" as const,
      sparkline: [],
      sparklineSource: "fallback" as const,
    };
  }, [selectedScopeTicker, selectedSymbol]);
  const defaultQuoteReferenceTicker = React.useMemo(
    () => redactMarketNewsTickerFallback(activeMarketScope.tickers[0]!),
    [activeMarketScope],
  );
  const selectedLookup = useMarketNewsTickerQuote(selectedLookupSeed);
  const selectedQuoteTicker =
    selectedScopeTicker ??
    selectedLookup.ticker ??
    selectedLookupSeed ??
    defaultQuoteReferenceTicker;
  const { articles, error, loading, meta, request } = useMarketNewsArticles({
    enabled: routeReady,
    limit: articleLimit,
    refreshKey,
    searchQuery,
    tickerSymbol,
    topic: activeTopic,
  });

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
  const activeSortOption =
    MARKET_NEWS_SORT_OPTIONS.find((option) => option.id === activeSortId) ??
    MARKET_NEWS_SORT_OPTIONS[0]!;
  React.useEffect(() => {
    if (loading || activeLens.id === "all" || activeLens.count > 0) return;

    resetEmptyLens();
  }, [activeLens.count, activeLens.id, loading, resetEmptyLens]);
  const visibleArticles = React.useMemo(
    () =>
      filterArticlesByLens({
        articles,
        lensId: activeLens.id,
        watchlistSymbols: watchlist.symbols,
      }),
    [activeLens.id, articles, watchlist.symbols],
  );
  const sortedArticles = React.useMemo(
    () =>
      sortMarketNewsArticles({
        articles: visibleArticles,
        sortId: activeSortId,
        watchlistSymbols: watchlist.symbols,
      }),
    [activeSortId, visibleArticles, watchlist.symbols],
  );
  const pageWindow = React.useMemo(
    () => getMarketNewsPageWindow(sortedArticles, storyPageIndex),
    [sortedArticles, storyPageIndex],
  );
  const displayedArticles = pageWindow.items;
  const railSummary = React.useMemo(
    () =>
      buildMarketNewsRailSummary({
        articles: displayedArticles,
        tickers: marketMovers.tickers,
        watchlistSymbols: watchlist.symbols,
      }),
    [displayedArticles, marketMovers.tickers, watchlist.symbols],
  );

  React.useEffect(() => {
    if (loading || !sortedArticles.length) return;

    clampStoryPageToCount(sortedArticles.length);
  }, [clampStoryPageToCount, loading, sortedArticles.length]);

  const displayState = React.useMemo(
    () =>
      buildMarketNewsDisplayState({
        activeLens,
        activeTopic,
        articleCount: articles.length,
        loading,
        meta,
        request,
        searchQuery,
        tickerSymbol,
        visibleArticleCount: visibleArticles.length,
      }),
    [
      activeLens,
      activeTopic,
      articles.length,
      loading,
      meta,
      request,
      searchQuery,
      tickerSymbol,
      visibleArticles.length,
    ],
  );

  const shownStatusValue = formatMarketNewsShownStatus({
    displayedCount: displayedArticles.length,
    pageStart: pageWindow.start,
    topicFeedMode: true,
  });
  return (
    <FitPageShell
      className={styles.shell}
      skipLabel="Skip to market news"
      skipTargetId="market-news-main"
    >
      <main id="market-news-main" tabIndex={-1} className={styles.page}>
        <div
          className={styles.pageInner}
          style={{ maxWidth: MARKET_NEWS_CONTENT_MAX_WIDTH_PX }}
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
              dataSource={marketMovers.source}
              loading={marketMovers.loading}
              marketScope={activeMarketScope}
              marketScopes={MARKET_NEWS_MARKET_SCOPES}
              providerLabel={marketMovers.providerLabel}
              tickers={marketMovers.tickers}
              updatedAt={marketMovers.updatedAt}
              warnings={marketMovers.warnings}
              onMarketScopeChange={handleMarketScopeChange}
            />
          </section>

          <MarketNewsViewConsole
            activeLensLabel={activeLens.label}
            activeSortLabel={activeSortOption.label}
            eyebrow={displayState.eyebrow}
            notice={displayState.coverageNotice}
            summary={displayState.summary}
            title={displayState.title}
          >
            <MarketNewsScanOrderBar
              activeSortId={activeSortId}
              options={MARKET_NEWS_SORT_OPTIONS}
              onSortChange={handleSortChange}
            />

            <MarketNewsLensBar
              activeLensId={activeLens.id}
              options={lensOptions}
              onLensChange={handleLensChange}
            />
          </MarketNewsViewConsole>

          <div className={styles.mainGrid}>
            <section
              className="min-w-0"
              aria-label={`${request.title} stories`}
              aria-busy={loading}
            >
              <MarketNewsArticleLayout
                articles={displayedArticles}
                emptyState={displayState.emptyState}
                error={error}
                feedStatus={shownStatusValue}
                loading={loading}
                pagination={
                  {
                    hasNextPage: pageWindow.hasNextPage,
                    hasPreviousPage: pageWindow.hasPreviousPage,
                    loading,
                    pageIndex: pageWindow.pageIndex,
                    pageSize: MARKET_NEWS_TOPIC_PAGE_SIZE,
                    totalLoaded: visibleArticles.length,
                    onNextPage: () => handleNextPage(pageWindow.hasNextPage),
                    onPreviousPage: handlePreviousPage,
                  }
                }
                providerWarning={displayState.providerWarning}
                title={displayState.title}
              />
            </section>

            <div className={cn(styles.rightRail, "min-w-0")}>
              <MarketNewsRightRail
                authenticated={watchlist.authenticated}
                lookupDraft={lookupDraft}
                quoteLoading={
                  selectedScopeTicker
                    ? marketMovers.loading
                    : selectedLookup.loading
                }
                railSummary={railSummary}
                selectedTicker={
                  quoteReferenceVisible ? selectedQuoteTicker : null
                }
                watchlistLoading={watchlist.loading}
                watchlistSymbols={watchlist.symbols}
                onLookupDraftChange={setLookupDraft}
                onQuoteReferenceChange={handleQuoteReferenceChange}
                onTickerNewsRequest={handleTickerNewsRequest}
              />
            </div>
          </div>
        </div>
      </main>
    </FitPageShell>
  );
}
