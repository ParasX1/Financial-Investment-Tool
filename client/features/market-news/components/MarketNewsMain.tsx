import * as React from "react";
import { useRouter } from "next/router";
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
import {
  getMarketNewsRouteHref,
  parseMarketNewsRouteQuery,
  type MarketNewsRouteState,
} from "../lib/marketNewsRouting";
import {
  MARKET_NEWS_SORT_OPTIONS,
  sortMarketNewsArticles,
} from "../lib/marketNewsSort";
import type {
  MarketNewsLensId,
  MarketNewsMarketScopeId,
  MarketNewsSortId,
  MarketNewsTopicId,
} from "../types";
import { useMarketNewsArticles } from "../hooks/useMarketNewsArticles";
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
import styles from "../styles/marketNews.module.css";

const ARTICLE_LIMIT = 18;

export function MarketNewsMain({
  onQuoteLookup,
}: {
  onQuoteLookup?: (symbol: string) => void;
}) {
  const router = useRouter();
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
  const [activeSortId, setActiveSortId] =
    React.useState<MarketNewsSortId>("latest");
  const [storyPageIndex, setStoryPageIndex] = React.useState(0);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [lookupDraft, setLookupDraft] = React.useState("");
  const [selectedSymbol, setSelectedSymbol] = React.useState(
    () =>
      resolveMarketNewsMarketScope(defaultMarketNewsMarketScopeId).tickers[0]!
        .symbol,
  );
  const activeTopic = resolveMarketNewsTopic(activeTopicId);
  const activeMarketScope = resolveMarketNewsMarketScope(activeMarketScopeId);
  const syncRouteState = React.useCallback(
    (nextState: Partial<MarketNewsRouteState>) => {
      if (!router.isReady) return;

      const href = getMarketNewsRouteHref({
        lensId: activeLensId,
        marketScopeId: activeMarketScopeId,
        pageIndex: storyPageIndex,
        searchQuery,
        sortId: activeSortId,
        tickerSymbol,
        topicId: activeTopicId,
        ...nextState,
      });

      if (href !== router.asPath) {
        void router.replace(href, undefined, {
          scroll: false,
          shallow: true,
        });
      }
    },
    [
      activeLensId,
      activeMarketScopeId,
      activeSortId,
      activeTopicId,
      router,
      searchQuery,
      storyPageIndex,
      tickerSymbol,
    ],
  );

  React.useEffect(() => {
    if (!router.isReady) return;

    const routeState = parseMarketNewsRouteQuery(router.query);
    const routeMarketScope = resolveMarketNewsMarketScope(
      routeState.marketScopeId,
    );
    const routeSelectedSymbol =
      routeState.tickerSymbol || routeMarketScope.tickers[0]?.symbol || "";

    setActiveTopicId(routeState.topicId);
    setActiveMarketScopeId(routeState.marketScopeId);
    setSearchDraft(routeState.searchQuery);
    setSearchQuery(routeState.searchQuery);
    setTickerSymbol(routeState.tickerSymbol);
    setLookupDraft(routeState.tickerSymbol);
    setActiveLensId(routeState.lensId);
    setActiveSortId(routeState.sortId);
    setStoryPageIndex(routeState.pageIndex);
    setSelectedSymbol(routeSelectedSymbol);
  }, [router.asPath, router.isReady, router.query]);

  const topicFeedMode =
    isMarketNewsPagedTopic(activeTopic.id) ||
    Boolean(searchQuery.trim()) ||
    Boolean(tickerSymbol);
  const articleLimit = topicFeedMode
    ? getMarketNewsFetchLimit(storyPageIndex)
    : ARTICLE_LIMIT;
  const watchlist = useMarketNewsWatchlist();
  const marketMovers = useMarketNewsTickerQuotes(activeMarketScope.tickers);
  const selectedScopeTicker = marketMovers.tickers.find(
    (ticker) => ticker.symbol === selectedSymbol,
  );
  const selectedLookupSeed = React.useMemo(() => {
    if (selectedScopeTicker || !selectedSymbol) return null;

    return {
      symbol: selectedSymbol,
      label: "Lookup selected",
      value: "Loading quote...",
      change: "Pending",
      tone: "neutral" as const,
      sparkline: [],
    };
  }, [selectedScopeTicker, selectedSymbol]);
  const selectedLookup = useMarketNewsTickerQuote(selectedLookupSeed);
  const selectedQuoteTicker =
    selectedScopeTicker ??
    selectedLookup.ticker ??
    selectedLookupSeed ??
    activeMarketScope.tickers[0]!;
  const { articles, error, loading, meta, request } = useMarketNewsArticles({
    enabled: router.isReady,
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
  React.useEffect(() => {
    if (loading || activeLens.id === "all" || activeLens.count > 0) return;

    setActiveLensId("all");
    setStoryPageIndex(0);
    syncRouteState({ lensId: "all", pageIndex: 0 });
  }, [activeLens.count, activeLens.id, loading, syncRouteState]);
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
    () =>
      topicFeedMode
        ? getMarketNewsPageWindow(sortedArticles, storyPageIndex)
        : null,
    [sortedArticles, storyPageIndex, topicFeedMode],
  );
  const displayedArticles = pageWindow?.items ?? sortedArticles;

  React.useEffect(() => {
    if (!topicFeedMode || loading || !sortedArticles.length) return;

    setStoryPageIndex((pageIndex) => {
      const clampedPageIndex = clampMarketNewsPageIndex(
        pageIndex,
        sortedArticles.length,
      );

      if (clampedPageIndex !== pageIndex) {
        syncRouteState({ pageIndex: clampedPageIndex });
      }

      return clampedPageIndex;
    });
  }, [loading, sortedArticles.length, syncRouteState, topicFeedMode]);

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
      setActiveLensId("all");
      setStoryPageIndex(0);
      setSearchQuery("");
      setSearchDraft("");
      setTickerSymbol("");
      setLookupDraft("");
      syncRouteState({
        lensId: "all",
        pageIndex: 0,
        searchQuery: "",
        tickerSymbol: "",
        topicId,
      });
    },
    [syncRouteState],
  );

  const handleSearchSubmit = React.useCallback(() => {
    const nextSearchQuery = searchDraft.trim();

    setActiveLensId("all");
    setStoryPageIndex(0);
    setSearchQuery(nextSearchQuery);
    setTickerSymbol("");
    setLookupDraft("");
    syncRouteState({
      lensId: "all",
      pageIndex: 0,
      searchQuery: nextSearchQuery,
      tickerSymbol: "",
    });
  }, [searchDraft, syncRouteState]);

  const handleSearchClear = React.useCallback(() => {
    setActiveLensId("all");
    setStoryPageIndex(0);
    setSearchDraft("");
    setSearchQuery("");
    setTickerSymbol("");
    setLookupDraft("");
    syncRouteState({
      lensId: "all",
      pageIndex: 0,
      searchQuery: "",
      tickerSymbol: "",
    });
  }, [syncRouteState]);

  const handleRefresh = React.useCallback(() => {
    setStoryPageIndex(0);
    setRefreshKey((key) => key + 1);
    syncRouteState({ pageIndex: 0 });
  }, [syncRouteState]);

  const handleMarketScopeChange = React.useCallback(
    (scopeId: MarketNewsMarketScopeId) => {
      const nextScope = resolveMarketNewsMarketScope(scopeId);
      const nextSymbol = tickerSymbol || nextScope.tickers[0]?.symbol || "";

      setActiveMarketScopeId(nextScope.id);
      setSelectedSymbol(nextSymbol);
      syncRouteState({ marketScopeId: nextScope.id });
    },
    [syncRouteState, tickerSymbol],
  );

  const handleQuoteLookup = React.useCallback(
    (value: string) => {
      const symbol = value.trim().toUpperCase();
      if (!symbol) return;

      setSelectedSymbol(symbol);
      setLookupDraft(symbol);
      setActiveLensId("all");
      setStoryPageIndex(0);
      setSearchDraft("");
      setSearchQuery("");
      setTickerSymbol(symbol);
      syncRouteState({
        lensId: "all",
        pageIndex: 0,
        searchQuery: "",
        tickerSymbol: symbol,
      });
      onQuoteLookup?.(symbol);
    },
    [onQuoteLookup, syncRouteState],
  );
  const handleLensChange = React.useCallback((lensId: MarketNewsLensId) => {
    setActiveLensId(lensId);
    setStoryPageIndex(0);
    syncRouteState({ lensId, pageIndex: 0 });
  }, [syncRouteState]);
  const handleSortChange = React.useCallback((sortId: MarketNewsSortId) => {
    setActiveSortId(sortId);
    setStoryPageIndex(0);
    syncRouteState({ pageIndex: 0, sortId });
  }, [syncRouteState]);
  const handlePreviousPage = React.useCallback(() => {
    setStoryPageIndex((pageIndex) => {
      const nextPageIndex = Math.max(0, pageIndex - 1);

      syncRouteState({ pageIndex: nextPageIndex });

      return nextPageIndex;
    });
  }, [syncRouteState]);
  const handleNextPage = React.useCallback(() => {
    if (!pageWindow?.hasNextPage) return;

    setStoryPageIndex((pageIndex) => {
      const nextPageIndex = pageIndex + 1;

      syncRouteState({ pageIndex: nextPageIndex });

      return nextPageIndex;
    });
  }, [pageWindow?.hasNextPage, syncRouteState]);
  const shownStatusValue =
    topicFeedMode && pageWindow
      ? displayedArticles.length
        ? `${pageWindow.start + 1}-${pageWindow.start + displayedArticles.length} loaded`
        : "0"
      : `${displayedArticles.length}/${articles.length}`;
  const sourceStatusValue =
    loading && articles.length ? "Updating" : meta?.providerLabel ?? "Pending";
  const coverageStatusValue =
    meta?.strictCategory === false ? "Broad feed" : "Strict filter";
  const articleProviderWarning =
    loading && articles.length
      ? "Updating this view while keeping the previous stories visible."
      : meta?.provider === "demo"
        ? "Demo stories are synthetic placeholders for local development. Do not treat them as live market news."
        : meta?.warnings[0];

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

          <section className={styles.viewConsole}>
            <div className={styles.viewConsoleHeader}>
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
                aria-live="polite"
              >
                <div className={styles.statusCard}>
                  <dt>Stories</dt>
                  <dd>{shownStatusValue}</dd>
                </div>
                <div className={styles.statusCard}>
                  <dt>Source</dt>
                  <dd>{sourceStatusValue}</dd>
                </div>
                <div className={styles.statusCard}>
                  <dt>Coverage</dt>
                  <dd>{coverageStatusValue}</dd>
                </div>
              </dl>
            </div>

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
          </section>

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
                providerWarning={articleProviderWarning}
                title={displayTitle}
              />
            </section>

            <div className={cn(styles.rightRail, "min-w-0")}>
              <MarketNewsRightRail
                authenticated={watchlist.authenticated}
                lookupDraft={lookupDraft}
                marketScope={activeMarketScope}
                quoteLoading={
                  selectedScopeTicker
                    ? marketMovers.loading
                    : selectedLookup.loading
                }
                selectedTicker={selectedQuoteTicker}
                tickers={marketMovers.tickers}
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
