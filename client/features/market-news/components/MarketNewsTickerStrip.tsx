import type { MarketNewsTicker } from "../types";
import { MarketNewsSparkline } from "./MarketNewsSparkline";

const toneClass = {
  negative: "text-[#ff4d5d]",
  neutral: "text-[#b9c1d0]",
  positive: "text-[#00b884]",
} as const;

export function MarketNewsTickerStrip({
  selectedSymbol,
  tickers,
  onTickerSelect,
}: {
  selectedSymbol: string;
  tickers: readonly MarketNewsTicker[];
  onTickerSelect: (symbol: string) => void;
}) {
  return (
    <section aria-label="Market snapshot" className="min-w-0">
      <div className="flex min-w-0 gap-3 overflow-x-auto px-3 py-4 [scrollbar-width:none] sm:px-8 lg:px-10 [&::-webkit-scrollbar]:hidden">
        <div className="flex shrink-0 items-center gap-2 pr-2 text-sm font-extrabold text-[#dce4ff]">
          <span
            className="grid h-8 w-8 place-items-center rounded-md border border-white/10 bg-white/[0.04]"
            aria-hidden="true"
          >
            AU
          </span>
          <span>Australia</span>
        </div>

        {tickers.map((ticker) => {
          const selected = selectedSymbol === ticker.symbol;

          return (
            <button
              key={ticker.symbol}
              type="button"
              onClick={() => onTickerSelect(ticker.symbol)}
              aria-pressed={selected}
              className={[
                "grid min-h-[76px] w-[12.5rem] shrink-0 grid-cols-[minmax(0,1fr)_5.8rem] items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
                selected
                  ? "border-[#00b884]/60 bg-[#00b884]/10"
                  : "border-white/10 bg-white/[0.035] hover:border-[#00b884]/45 hover:bg-white/[0.055]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7b8cff]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
              ].join(" ")}
            >
              <span className="min-w-0">
                <span className="block truncate text-xs font-extrabold uppercase text-[#8fc7ff]">
                  {ticker.label}
                </span>
                <span className="mt-1 block truncate text-base font-extrabold text-white">
                  {ticker.value}
                </span>
                <span className={`mt-1 block truncate text-xs font-bold ${toneClass[ticker.tone]}`}>
                  {ticker.change}
                </span>
              </span>
              <span className={`justify-self-end ${toneClass[ticker.tone]}`}>
                <MarketNewsSparkline data={ticker.sparkline} />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

