import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { FIT_FOCUS_VISIBLE, cn } from "@/components/shared/uiPrimitives";
import type { MarketNewsTicker, MarketNewsTopic } from "../types";

const toneClass = {
  negative: "text-[#ff4d5d]",
  neutral: "text-[#b9c1d0]",
  positive: "text-[#00b884]",
} as const;

export function MarketNewsRightRail({
  activeTopic,
  authenticated,
  lookupDraft,
  selectedSymbol,
  tickers,
  watchlistLoading,
  watchlistSymbols,
  onLookupDraftChange,
  onQuoteLookup,
}: {
  activeTopic: MarketNewsTopic;
  authenticated: boolean;
  lookupDraft: string;
  selectedSymbol: string;
  tickers: readonly MarketNewsTicker[];
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
      <section className="rounded-lg border border-white/10 bg-[#0d0f12] p-4">
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
          <div className="relative">
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
              className="h-11 w-full rounded-full border border-[#202230] bg-[#181c22] pl-10 pr-4 text-sm font-semibold text-white placeholder:text-[#8791a3] focus:border-[#00b884]/70 focus:outline-none focus:ring-2 focus:ring-[#00b884]/15"
            />
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-white/10 bg-[#0d0f12] p-4">
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

      <section className="rounded-lg border border-white/10 bg-[#0d0f12] p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold text-white">Trending Tickers</h2>
          <span className="text-xs font-bold text-[#8f98aa]">AU</span>
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
                <span className={`block text-xs font-bold ${toneClass[ticker.tone]}`}>
                  {ticker.change}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-[#0d0f12] p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold text-white">Selected Quote</h2>
          <span className={`text-xs font-bold ${toneClass[selectedTicker.tone]}`}>
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

      <section className="rounded-lg border border-white/10 bg-[#0d0f12] p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold text-white">My Watchlist</h2>
          <span className="text-xs font-bold text-[#8f98aa]">
            {watchlistSymbols.length} total
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {watchlistLoading ? (
            <span className="text-sm font-semibold text-[#8f98aa]">Loading...</span>
          ) : watchlistSymbols.length ? (
            watchlistSymbols.slice(0, 8).map((symbol) => (
              <button
                key={symbol}
                type="button"
                onClick={() => onQuoteLookup(symbol)}
                className={cn(
                  "rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-extrabold text-[#dce4ff] transition-colors hover:border-[#00b884]/45",
                  FIT_FOCUS_VISIBLE,
                )}
              >
                {symbol}
              </button>
            ))
          ) : (
            <span className="text-sm leading-6 text-[#8f98aa]">
              {authenticated ? "No saved tickers yet." : "Sign in to load saved tickers."}
            </span>
          )}
        </div>
      </section>
    </aside>
  );
}
