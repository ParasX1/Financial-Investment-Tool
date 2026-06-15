import * as React from "react";
import { FitPageShell } from "@/components/shared/FitPageShell";
import { cn } from "@/components/shared/uiPrimitives";
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
import type { MarketNewsMarketScopeId, MarketNewsTopicId } from "../types";
import { useMarketNewsArticles } from "../hooks/useMarketNewsArticles";
import { useMarketNewsWatchlist } from "../hooks/useMarketNewsWatchlist";
import { MarketNewsArticleLayout } from "./MarketNewsArticleLayout";
import { MarketNewsCategoryNav } from "./MarketNewsCategoryNav";
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
  const [activeTopicId, setActiveTopicId] =
    React.useState<MarketNewsTopicId>(defaultMarketNewsTopicId);
  const [activeMarketScopeId, setActiveMarketScopeId] =
    React.useState<MarketNewsMarketScopeId>(defaultMarketNewsMarketScopeId);
  const [searchDraft, setSearchDraft] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [tickerSymbol, setTickerSymbol] = React.useState("");
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [lookupDraft, setLookupDraft] = React.useState("");
  const activeTopic = resolveMarketNewsTopic(activeTopicId);
  const activeMarketScope = resolveMarketNewsMarketScope(activeMarketScopeId);
  const [selectedSymbol, setSelectedSymbol] = React.useState(
    activeMarketScope.tickers[0]!.symbol,
  );
  const watchlist = useMarketNewsWatchlist();
  const { articles, error, loading, request } = useMarketNewsArticles({
    limit: ARTICLE_LIMIT,
    refreshKey,
    searchQuery,
    tickerSymbol,
    topic: activeTopic,
  });

  const activeSummary = React.useMemo(() => {
    if (searchQuery.trim()) {
      return `Showing market news results for "${searchQuery.trim()}" within ${activeTopic.label}.`;
    }

    if (tickerSymbol) {
      return `Showing ticker-specific headlines for ${tickerSymbol}.`;
    }

    return activeTopic.description;
  }, [activeTopic.description, activeTopic.label, searchQuery, tickerSymbol]);

  const handleTopicChange = React.useCallback((topicId: MarketNewsTopicId) => {
    setActiveTopicId(topicId);
    setSearchQuery("");
    setSearchDraft("");
    setTickerSymbol("");
  }, []);

  const handleSearchSubmit = React.useCallback(() => {
    setSearchQuery(searchDraft.trim());
    setTickerSymbol("");
  }, [searchDraft]);

  const handleSearchClear = React.useCallback(() => {
    setSearchDraft("");
    setSearchQuery("");
    setTickerSymbol("");
  }, []);

  const handleRefresh = React.useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  const handleMarketScopeChange = React.useCallback(
    (scopeId: MarketNewsMarketScopeId) => {
      const nextScope = resolveMarketNewsMarketScope(scopeId);
      const nextSymbol = nextScope.tickers[0]?.symbol ?? "";

      setActiveMarketScopeId(nextScope.id);
      setSelectedSymbol(nextSymbol);
      setLookupDraft("");
    },
    [],
  );

  const handleQuoteLookup = React.useCallback(
    (value: string) => {
      const symbol = value.trim().toUpperCase();
      if (!symbol) return;

      setSelectedSymbol(symbol);
      setLookupDraft(symbol);
      setSearchDraft("");
      setSearchQuery("");
      setTickerSymbol(symbol);
      onQuoteLookup?.(symbol);
    },
    [onQuoteLookup],
  );

  return (
    <FitPageShell
      className={styles.shell}
      skipLabel="Skip to market news"
      skipTargetId="market-news-main"
    >
      <main
        id="market-news-main"
        tabIndex={-1}
        className="ml-[var(--app-sidebar-width,64px)] min-h-screen bg-black text-white transition-[margin-left] duration-200 ease-out"
      >
        <header className={styles.topBar}>
          <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 px-3 py-4 sm:px-8 lg:flex-row lg:items-center lg:px-10">
            <div className="min-w-0 lg:w-[14rem]">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#00b884]">
                FIT Finance
              </p>
              <h1 className="mt-1 text-2xl font-extrabold leading-tight text-white">
                Market News
              </h1>
            </div>
            <MarketNewsSearchBar
              draft={searchDraft}
              searchQuery={searchQuery}
              onClear={handleSearchClear}
              onDraftChange={setSearchDraft}
              onRefresh={handleRefresh}
              onSubmit={handleSearchSubmit}
            />
          </div>
        </header>

        <div className={styles.categoryRail}>
          <MarketNewsCategoryNav
            activeTopicId={activeTopic.id}
            groups={MARKET_NEWS_NAV_GROUPS}
            onTopicChange={handleTopicChange}
          />
        </div>

        <div className={styles.tickerRail}>
          <MarketNewsTickerStrip
            marketScope={activeMarketScope}
            marketScopes={MARKET_NEWS_MARKET_SCOPES}
            selectedSymbol={selectedSymbol}
            tickers={activeMarketScope.tickers}
            onMarketScopeChange={handleMarketScopeChange}
            onTickerSelect={handleQuoteLookup}
          />
        </div>

        <div className="mx-auto w-full max-w-[1500px] px-3 py-5 sm:px-8 sm:py-6 lg:px-10">
          <section className="mb-5 min-w-0" aria-live="polite">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#687184]">
              {activeTopic.eyebrow}
            </p>
            <div className="mt-2 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-balance text-2xl font-extrabold leading-tight text-white sm:text-3xl">
                  {request.title}
                </h2>
                <p className="mt-2 max-w-[48rem] text-pretty text-[15px] leading-6 text-[#b9c1d0]">
                  {activeSummary}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-[#8f98aa]">
                Data provider: NewsAPI.org
              </p>
            </div>
          </section>

          <div className={styles.mainGrid}>
            <section
              className="min-w-0"
              aria-label={`${request.title} stories`}
              aria-busy={loading}
            >
              <MarketNewsArticleLayout
                articles={articles}
                error={error}
                loading={loading}
                title={request.title}
              />
            </section>

            <div className={cn(styles.rightRail, "min-w-0")}>
              <MarketNewsRightRail
                activeTopic={activeTopic}
                authenticated={watchlist.authenticated}
                lookupDraft={lookupDraft}
                marketScope={activeMarketScope}
                selectedSymbol={selectedSymbol}
                tickers={activeMarketScope.tickers}
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
