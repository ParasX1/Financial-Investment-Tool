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
import type {
  MarketNewsLensId,
  MarketNewsMarketScopeId,
  MarketNewsTopicId,
} from "../types";
import { useMarketNewsArticles } from "../hooks/useMarketNewsArticles";
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
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [lookupDraft, setLookupDraft] = React.useState("");
  const activeTopic = resolveMarketNewsTopic(activeTopicId);
  const activeMarketScope = resolveMarketNewsMarketScope(activeMarketScopeId);
  const [selectedSymbol, setSelectedSymbol] = React.useState(
    activeMarketScope.tickers[0]!.symbol,
  );
  const watchlist = useMarketNewsWatchlist();
  const { articles, error, loading, meta, request } = useMarketNewsArticles({
    limit: ARTICLE_LIMIT,
    marketScope: activeMarketScope,
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
  const visibleArticles = React.useMemo(
    () =>
      filterArticlesByLens({
        articles,
        lensId: activeLens.id,
        watchlistSymbols: watchlist.symbols,
      }),
    [activeLens.id, articles, watchlist.symbols],
  );

  const watchlistArticleCount = React.useMemo(() => {
    const watchlistSet = new Set(
      watchlist.symbols.map((symbol) => symbol.toUpperCase()),
    );

    if (!watchlistSet.size) return 0;

    return visibleArticles.filter((article) =>
      (article.relatedSymbols ?? []).some((symbol) =>
        watchlistSet.has(symbol.toUpperCase()),
      ),
    ).length;
  }, [visibleArticles, watchlist.symbols]);

  const providerStatus = React.useMemo(() => {
    if (loading) return "Refreshing";
    if (meta?.provider === "demo") return "Demo mode";
    if (meta?.provider === "none") return "Provider setup needed";
    if (meta?.providerLabel) return `Provider: ${meta.providerLabel}`;
    return "Provider: Market news service";
  }, [loading, meta?.provider, meta?.providerLabel]);

  const emptyState = React.useMemo(() => {
    if (articles.length && !visibleArticles.length) {
      return {
        title: `No ${activeLens.label.toLowerCase()} stories in this view`,
        message:
          "This trader lens is strict, so it only shows headlines that match the selected signal. Switch back to All to see every story.",
        detail: activeLens.description,
      };
    }

    if (meta?.provider === "none") {
      return {
        title: "Connect a market news provider",
        message:
          "Set MARKETAUX_API_KEY on the server to load finance-specific stories for this category.",
        detail: meta.warnings[0],
      };
    }

    return {
      title: `No ${request.title} stories found`,
      message:
        "This view uses a strict category query, so it will stay empty instead of filling with unrelated business headlines.",
      detail: meta?.query ? `Query checked: ${meta.query}` : undefined,
    };
  }, [
    activeLens.description,
    activeLens.label,
    articles.length,
    meta,
    request.title,
    visibleArticles.length,
  ]);

  const handleTopicChange = React.useCallback(
    (topicId: MarketNewsTopicId) => {
      setActiveTopicId(topicId);
      setSearchQuery("");
      setSearchDraft("");
      setTickerSymbol("");
      setLookupDraft("");
      setSelectedSymbol(activeMarketScope.tickers[0]?.symbol ?? "");
    },
    [activeMarketScope.tickers],
  );

  const handleSearchSubmit = React.useCallback(() => {
    const defaultSymbol = activeMarketScope.tickers[0]?.symbol ?? "";

    setSearchQuery(searchDraft.trim());
    setTickerSymbol("");
    setLookupDraft("");
    setSelectedSymbol(defaultSymbol);
  }, [activeMarketScope.tickers, searchDraft]);

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
      setSearchDraft("");
      setSearchQuery("");
      setTickerSymbol("");
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
      <main id="market-news-main" tabIndex={-1} className={styles.page}>
        <div
          className={styles.pageInner}
          style={{ maxWidth: FIT_CONTENT_MAX_WIDTH_PX }}
        >
          <FitPageHeader
            title="Market News"
            subtitle="Track market-moving headlines, ticker context, and watchlist signals in the same FIT workspace."
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

          <section className={styles.marketPanel} aria-label="Market snapshot">
            <div className={styles.marketPanelHeader}>
              <div className="min-w-0">
                <p className={cn("text-xs font-bold uppercase", fitText.label)}>
                  Market scope
                </p>
                <h2 className="mt-1 text-lg font-extrabold leading-tight text-white">
                  {activeMarketScope.label}
                </h2>
                <p className={cn("mt-1 text-sm leading-6", fitText.body)}>
                  {activeMarketScope.description}
                </p>
              </div>
              <span
                className={cn(
                  styles.providerPill,
                  loading ? styles.providerPillLoading : "",
                )}
              >
                {providerStatus}
              </span>
            </div>

            <MarketNewsTickerStrip
              marketScope={activeMarketScope}
              marketScopes={MARKET_NEWS_MARKET_SCOPES}
              selectedSymbol={selectedSymbol}
              tickers={activeMarketScope.tickers}
              onMarketScopeChange={handleMarketScopeChange}
              onTickerSelect={handleQuoteLookup}
            />
          </section>

          <section className={styles.storyIntro} aria-live="polite">
            <div className="min-w-0">
              <p className={cn("text-xs font-bold uppercase", fitText.label)}>
                {activeTopic.eyebrow}
              </p>
              <div className="min-w-0">
                <h2 className="mt-2 text-balance text-2xl font-extrabold leading-tight text-white">
                  {request.title}
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
                <dd>
                  {visibleArticles.length}/{articles.length}
                </dd>
              </div>
              <div className={styles.statusCard}>
                <dt>Watchlist hits</dt>
                <dd>{watchlistArticleCount}</dd>
              </div>
              <div className={styles.statusCard}>
                <dt>Selected</dt>
                <dd>{selectedSymbol}</dd>
              </div>
            </dl>
          </section>

          <MarketNewsLensBar
            activeLensId={activeLens.id}
            options={lensOptions}
            onLensChange={setActiveLensId}
          />

          <div className={styles.mainGrid}>
            <section
              className="min-w-0"
              aria-label={`${request.title} stories`}
              aria-busy={loading}
            >
              <MarketNewsArticleLayout
                articles={visibleArticles}
                emptyState={emptyState}
                error={error}
                loading={loading}
                providerWarning={
                  meta?.provider === "demo" ? undefined : meta?.warnings[0]
                }
                title={request.title}
              />
            </section>

            <div className={cn(styles.rightRail, "min-w-0")}>
              <MarketNewsRightRail
                activeTopic={activeTopic}
                articleCount={visibleArticles.length}
                authenticated={watchlist.authenticated}
                lookupDraft={lookupDraft}
                marketScope={activeMarketScope}
                providerLabel={meta?.providerLabel ?? "Pending"}
                providerWarning={meta?.warnings[0]}
                selectedSymbol={selectedSymbol}
                tickers={activeMarketScope.tickers}
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
