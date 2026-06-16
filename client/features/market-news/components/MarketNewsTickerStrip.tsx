import * as React from "react";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import { FIT_FOCUS_VISIBLE, cn } from "@/components/shared/uiPrimitives";
import type {
  MarketNewsMarketScope,
  MarketNewsMarketScopeId,
  MarketNewsTicker,
} from "../types";
import { MarketNewsSparkline } from "./MarketNewsSparkline";
import styles from "../styles/marketNews.module.css";

const toneClass = {
  negative: "text-[var(--market-news-negative)]",
  neutral: "text-[#b9c1d0]",
  positive: "text-[var(--market-news-positive)]",
} as const;

export function MarketNewsTickerStrip({
  marketScope,
  marketScopes,
  tickers,
  loading = false,
  updatedAt,
  onMarketScopeChange,
}: {
  marketScope: MarketNewsMarketScope;
  marketScopes: readonly MarketNewsMarketScope[];
  tickers: readonly MarketNewsTicker[];
  loading?: boolean;
  updatedAt?: Date | null;
  onMarketScopeChange: (scopeId: MarketNewsMarketScopeId) => void;
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuId = React.useId();
  const updatedLabel = updatedAt
    ? updatedAt.toLocaleTimeString("en-AU", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  React.useEffect(() => {
    setMenuOpen(false);
  }, [marketScope.id]);

  return (
    <section aria-label="Market movers" className={styles.marketMoverStrip}>
      <div className={styles.scopePicker}>
        <button
          type="button"
          aria-controls={menuOpen ? menuId : undefined}
          aria-expanded={menuOpen}
          aria-haspopup="listbox"
          onClick={() => setMenuOpen((open) => !open)}
          className={cn(styles.scopeSelectButton, FIT_FOCUS_VISIBLE)}
        >
          <span className={styles.scopeIcon} aria-hidden="true">
            <PublicRoundedIcon sx={{ fontSize: 16 }} />
          </span>
          <span className="min-w-0">
            <span className={styles.scopeShortLabel}>
              {marketScope.shortLabel}
            </span>
            <span className={styles.scopeLabel}>{marketScope.label}</span>
          </span>
          <KeyboardArrowDownRoundedIcon
            className={menuOpen ? styles.scopeChevronOpen : undefined}
            sx={{ fontSize: 18 }}
            aria-hidden="true"
          />
        </button>

        {menuOpen ? (
          <div
            id={menuId}
            role="listbox"
            aria-label="Market mover groups"
            className={styles.scopeMenu}
          >
            {marketScopes.map((scope) => {
              const selected = scope.id === marketScope.id;

              return (
                <button
                  key={scope.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => onMarketScopeChange(scope.id)}
                  className={cn(
                    styles.scopeMenuItem,
                    selected ? styles.scopeMenuItemActive : "",
                    FIT_FOCUS_VISIBLE,
                  )}
                >
                  <span className={styles.scopeMenuShort}>
                    {scope.shortLabel}
                  </span>
                  <span className={styles.scopeMenuLabel}>{scope.label}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className={styles.marketMoverQuotes}>
        <div
          className={styles.tickerScroller}
          aria-label={`${marketScope.label} quote snapshots`}
        >
          {tickers.map((ticker) => (
            <article
              key={ticker.symbol}
              aria-label={`${ticker.label} quote snapshot`}
              className={styles.tickerCard}
            >
              <span className={styles.tickerText}>
                <span className={styles.tickerLabel}>{ticker.label}</span>
                <span className={styles.tickerValue}>{ticker.value}</span>
                <span
                  className={`${styles.tickerChange} ${toneClass[ticker.tone]}`}
                >
                  {ticker.change}
                </span>
              </span>
              <span className={`${styles.tickerSpark} ${toneClass[ticker.tone]}`}>
                <MarketNewsSparkline
                  data={ticker.sparkline}
                  height={22}
                  width={68}
                />
              </span>
            </article>
          ))}
        </div>

        <span className={styles.marketMoverMeta} aria-live="polite">
          {loading ? "Updating" : updatedLabel ? `Updated ${updatedLabel}` : "Live"}
        </span>
      </div>
    </section>
  );
}
