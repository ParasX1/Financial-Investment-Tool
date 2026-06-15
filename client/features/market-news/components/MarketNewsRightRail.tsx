import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { fitButton } from "@/components/shared/fitStyles";
import { FIT_FOCUS_VISIBLE, cn } from "@/components/shared/uiPrimitives";
import type {
  MarketNewsMarketScope,
  MarketNewsTicker,
  MarketNewsTopic,
} from "../types";

const toneClass = {
  negative: "text-[var(--market-news-negative)]",
  neutral: "text-[#b9c1d0]",
  positive: "text-[var(--market-news-positive)]",
} as const;

const railSectionClass =
  "rounded-xl border border-[var(--fit-color-border-panel)] bg-[var(--fit-color-surface)] p-4";

export function MarketNewsRightRail({
  activeTopic,
  articleCount,
  authenticated,
  lookupDraft,
  marketScope,
  providerLabel,
  providerWarning,
  selectedSymbol,
  tickers,
  watchlistArticleCount,
  watchlistLoading,
  watchlistSymbols,
  onLookupDraftChange,
  onQuoteLookup,
}: {
  activeTopic: MarketNewsTopic;
  articleCount: number;
  authenticated: boolean;
  lookupDraft: string;
  marketScope: MarketNewsMarketScope;
  providerLabel: string;
  providerWarning?: string;
  selectedSymbol: string;
  tickers: readonly MarketNewsTicker[];
  watchlistArticleCount: number;
  watchlistLoading: boolean;
  watchlistSymbols: readonly string[];
  onLookupDraftChange: (value: string) => void;
  onQuoteLookup: (symbol: string) => void;
}) {
  const selectedTicker =
    tickers.find((ticker) => ticker.symbol === selectedSymbol) ?? {
      symbol: selectedSymbol,
      label: "Lookup selected",
      value: "No live quote loaded",
      change: "Pending",
      tone: "neutral" as const,
      sparkline: [],
    };

  return (
    <aside className="space-y-4" aria-label="Market news side panel">
      <section className={railSectionClass}>
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            onQuoteLookup(lookupDraft);
          }}
        >
          <label htmlFor="market-news-quote" className="sr-only">
            Quote lookup
          </label>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <div className="relative min-w-0">
              <SearchRoundedIcon
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8f98aa]"
                sx={{ fontSize: 20 }}
                aria-hidden="true"
              />
              <input
                id="market-news-quote"
                type="search"
                value={lookupDraft}
                onChange={(event) => onLookupDraftChange(event.target.value)}
                placeholder="Quote lookup"
                className="h-11 w-full rounded-lg border border-[var(--fit-color-border-control)] bg-[var(--fit-color-field)] pl-10 pr-4 text-sm font-semibold text-white placeholder:text-[#7f8798] focus:border-[#6f7cff]/75 focus:outline-none focus:ring-2 focus:ring-[#6f7cff]/20"
              />
            </div>
            <button
              type="submit"
              aria-label="Look up quote"
              className={cn(
                "grid h-11 w-11 place-items-center rounded-lg text-white",
                fitButton.primary,
                FIT_FOCUS_VISIBLE,
              )}
            >
              <SearchRoundedIcon sx={{ fontSize: 20 }} aria-hidden="true" />
            </button>
          </div>
        </form>
      </section>

      <section className={railSectionClass}>
        <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-[#687184]">
          Focus
        </p>
        <h2 className="mt-2 text-xl font-extrabold text-white">
          {activeTopic.label}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#b9c1d0]">
          {activeTopic.description}
        </p>
      </section>

      <section className={railSectionClass}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold text-white">News Quality</h2>
          <span className="rounded-md border border-[#5367ff]/30 bg-[#5367ff]/10 px-2 py-1 text-xs font-extrabold text-[#dbe4ff]">
            Strict
          </span>
        </div>
        <dl className="mt-3 grid gap-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[#8f98aa]">Provider</dt>
            <dd className="font-extrabold text-white">{providerLabel}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[#8f98aa]">Stories</dt>
            <dd className="font-extrabold text-white">{articleCount}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[#8f98aa]">Watchlist hits</dt>
            <dd className="font-extrabold text-white">
              {watchlistArticleCount}
            </dd>
          </div>
        </dl>
        {providerWarning ? (
          <p className="mt-3 rounded-lg border border-[#f6c85f]/30 bg-[#f6c85f]/10 px-3 py-2 text-xs font-semibold leading-5 text-[#ffe7a3]">
            {providerWarning}
          </p>
        ) : null}
      </section>

      <section className={railSectionClass}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold text-white">Trending Tickers</h2>
          <span className="text-xs font-bold text-[#8f98aa]">
            {marketScope.shortLabel}
          </span>
        </div>
        <div className="mt-3 divide-y divide-white/10">
          {tickers.slice(0, 5).map((ticker) => (
            <button
              key={ticker.symbol}
              type="button"
              onClick={() => onQuoteLookup(ticker.symbol)}
              className={cn(
                "grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 py-3 text-left transition-colors hover:text-white",
                FIT_FOCUS_VISIBLE,
              )}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-extrabold text-[#8fc7ff]">
                  {ticker.symbol}
                </span>
                <span className="block truncate text-xs font-semibold text-[#8f98aa]">
                  {ticker.label}
                </span>
              </span>
              <span className="text-right">
                <span className="block text-sm font-extrabold text-white">
                  {ticker.value}
                </span>
                <span
                  className={`block text-xs font-bold ${toneClass[ticker.tone]}`}
                >
                  {ticker.change}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className={railSectionClass}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold text-white">Selected Quote</h2>
          <span
            className={`text-xs font-bold ${toneClass[selectedTicker.tone]}`}
          >
            {selectedTicker.change}
          </span>
        </div>
        <p className="mt-2 text-2xl font-extrabold text-white">
          {selectedTicker.symbol}
        </p>
        <p className="text-sm font-semibold text-[#8f98aa]">
          {selectedTicker.label}
        </p>
        <p className="mt-3 text-xl font-extrabold text-white">
          {selectedTicker.value}
        </p>
      </section>

      <section className={railSectionClass}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold text-white">My Watchlist</h2>
          <span className="text-xs font-bold text-[#8f98aa]">
            {watchlistSymbols.length} total
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {watchlistLoading ? (
            <span className="text-sm font-semibold text-[#8f98aa]">
              Loading...
            </span>
          ) : watchlistSymbols.length ? (
            watchlistSymbols.slice(0, 8).map((symbol) => (
              <button
                key={symbol}
                type="button"
                onClick={() => onQuoteLookup(symbol)}
                className={cn(
                  "rounded-md border border-[var(--fit-color-border-subtle)] px-2.5 py-1.5 text-xs font-extrabold",
                  fitButton.secondary,
                  FIT_FOCUS_VISIBLE,
                )}
              >
                {symbol}
              </button>
            ))
          ) : (
            <span className="text-sm leading-6 text-[#8f98aa]">
              {authenticated
                ? "No saved tickers yet."
                : "Sign in to load saved tickers."}
            </span>
          )}
        </div>
      </section>
    </aside>
  );
}
