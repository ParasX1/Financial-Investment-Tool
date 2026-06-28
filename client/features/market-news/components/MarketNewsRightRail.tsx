import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { fitButton } from "@/components/shared/fitStyles";
import { FIT_FOCUS_VISIBLE, cn } from "@/components/shared/uiPrimitives";
import type { MarketNewsTicker } from "../types";
import type { MarketNewsRailSummary } from "../lib/marketNewsRailSummary";
import styles from "../styles/marketNews.module.css";

const toneClass = {
  negative: "text-[var(--market-news-negative)]",
  neutral: "text-[#b9c1d0]",
  positive: "text-[var(--market-news-positive)]",
} as const;

const railSectionClass = styles.rightRailSection;

export function MarketNewsRightRail({
  authenticated,
  lookupDraft,
  quoteLoading = false,
  railSummary,
  selectedTicker,
  watchlistLoading,
  watchlistSymbols,
  onLookupDraftChange,
  onQuoteReferenceChange,
  onTickerNewsRequest,
}: {
  authenticated: boolean;
  lookupDraft: string;
  quoteLoading?: boolean;
  railSummary: MarketNewsRailSummary;
  selectedTicker: MarketNewsTicker | null;
  watchlistLoading: boolean;
  watchlistSymbols: readonly string[];
  onLookupDraftChange: (value: string) => void;
  onQuoteReferenceChange: (symbol: string) => void;
  onTickerNewsRequest: (symbol: string) => void;
}) {
  return (
    <aside
      className={styles.rightRailPanel}
      aria-label="Market news side panel"
    >
      <section className={railSectionClass}>
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            onQuoteReferenceChange(lookupDraft);
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
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold text-white">
            Watchlist impact
          </h2>
          <span className="text-xs font-bold text-[#8f98aa]">
            {watchlistSymbols.length} saved
          </span>
        </div>
        {watchlistLoading ? (
          <p className="mt-3 text-sm leading-6 text-[#8f98aa]">
            Loading saved tickers...
          </p>
        ) : !authenticated ? (
          <p className="mt-3 text-sm leading-6 text-[#8f98aa]">
            Sign in to check whether shown stories mention tickers you follow.
          </p>
        ) : !watchlistSymbols.length ? (
          <p className="mt-3 text-sm leading-6 text-[#8f98aa]">
            No saved tickers yet. Save tickers to highlight matching stories.
          </p>
        ) : railSummary.watchlistStoryCount ? (
          <>
            <p className="mt-3 text-sm font-semibold leading-6 text-[#dce4ff]">
              {railSummary.watchlistStoryCount} shown{" "}
              {railSummary.watchlistStoryCount === 1 ? "story" : "stories"}{" "}
              mention {railSummary.watchlistHitCount} saved{" "}
              {railSummary.watchlistHitCount === 1 ? "ticker" : "tickers"}.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {railSummary.watchlistTickers.map((ticker) => (
                <button
                  key={ticker.symbol}
                  type="button"
                  onClick={() => onQuoteReferenceChange(ticker.symbol)}
                  className={cn(
                    "rounded-md border border-[var(--fit-color-border-subtle)] px-2.5 py-1.5 text-xs font-extrabold text-[#dbe4ff]",
                    fitButton.secondary,
                    FIT_FOCUS_VISIBLE,
                  )}
                >
                  {ticker.symbol}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-3 text-sm leading-6 text-[#8f98aa]">
            No saved ticker mentions in the shown stories.
          </p>
        )}
      </section>

      <section className={railSectionClass}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold text-white">
            Mentioned tickers
          </h2>
          <span className="text-xs font-bold text-[#8f98aa]">
            {railSummary.totalLinkedStoryCount} linked
          </span>
        </div>
        {railSummary.mentionedTickers.length ? (
          <div className="mt-3 divide-y divide-white/10">
            {railSummary.mentionedTickers.map((ticker) => (
              <button
                key={ticker.symbol}
                type="button"
                onClick={() => onQuoteReferenceChange(ticker.symbol)}
                className={cn(
                  "grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 py-3 text-left transition-colors hover:text-white",
                  FIT_FOCUS_VISIBLE,
                )}
                title={`Inspect quote context for ${ticker.label}`}
              >
                <span className="min-w-0">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-extrabold text-[#8fc7ff]">
                      {ticker.symbol}
                    </span>
                    {ticker.inWatchlist ? (
                      <span className="rounded-full bg-[#0f2b22] px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-[#7dffc0]">
                        Saved
                      </span>
                    ) : null}
                  </span>
                  <span className="block truncate text-xs font-semibold text-[#8f98aa]">
                    {ticker.label}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-xs font-extrabold text-[#dce4ff]">
                    {ticker.count} {ticker.count === 1 ? "story" : "stories"}
                  </span>
                  {ticker.value ? (
                    <span
                      className={`block text-xs font-bold ${
                        toneClass[ticker.tone ?? "neutral"]
                      }`}
                    >
                      {ticker.change ?? ticker.value}
                    </span>
                  ) : null}
                </span>
                <span className="sr-only">Inspect quote</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-[#8f98aa]">
            No reliable ticker links in the shown stories yet.
          </p>
        )}
      </section>

      {selectedTicker ? (
        <section className={railSectionClass}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold text-white">
              Quote reference
            </h2>
            <span
              className={`text-xs font-bold ${toneClass[selectedTicker.tone]}`}
            >
              {quoteLoading ? "Updating" : selectedTicker.change}
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
          <p className="mt-2 text-xs font-semibold leading-5 text-[#8f98aa]">
            Quote context only. Use ticker news to run an explicit headline
            search.
          </p>
          <button
            type="button"
            onClick={() => onTickerNewsRequest(selectedTicker.symbol)}
            className={cn(
              "mt-3 w-full rounded-lg border border-[var(--fit-color-border-subtle)] bg-white/[0.035] px-3 py-2 text-sm font-extrabold text-[#dbe4ff] transition-colors hover:border-[#5367ff]/45 hover:bg-white/[0.055] hover:text-white",
              FIT_FOCUS_VISIBLE,
            )}
          >
            Show ticker news
          </button>
        </section>
      ) : null}
    </aside>
  );
}
