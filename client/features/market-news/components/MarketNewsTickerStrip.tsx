import * as React from "react";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import { FIT_FOCUS_VISIBLE, cn } from "@/components/shared/uiPrimitives";
import type {
  MarketNewsMarketScope,
  MarketNewsMarketScopeId,
  MarketNewsTicker,
} from "../types";
import type { MarketNewsTickerStripSource } from "../lib/marketNewsTickerStripService";
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
  dataSource = "fallback",
  tickers,
  loading = false,
  providerLabel = "Yahoo Finance",
  updatedAt,
  warning,
  onMarketScopeChange,
}: {
  dataSource?: MarketNewsTickerStripSource;
  marketScope: MarketNewsMarketScope;
  marketScopes: readonly MarketNewsMarketScope[];
  tickers: readonly MarketNewsTicker[];
  loading?: boolean;
  providerLabel?: string;
  updatedAt?: Date | null;
  warning?: string;
  onMarketScopeChange: (scopeId: MarketNewsMarketScopeId) => void;
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);
  const pickerRef = React.useRef<HTMLDivElement | null>(null);
  const scrollerRef = React.useRef<HTMLDivElement | null>(null);
  const optionRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = React.useId();
  const [canScrollBackward, setCanScrollBackward] = React.useState(false);
  const [canScrollForward, setCanScrollForward] = React.useState(false);
  const selectedIndex = Math.max(
    0,
    marketScopes.findIndex((scope) => scope.id === marketScope.id),
  );
  const updatedLabel = updatedAt
    ? updatedAt.toLocaleTimeString("en-AU", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const sourceStatusLabel = loading
    ? "Updating quotes"
    : updatedLabel
      ? dataSource === "mixed"
        ? `Mixed live/fallback ${updatedLabel}`
        : `${providerLabel} live ${updatedLabel}`
      : `${providerLabel} fallback quote mix`;

  const updateScrollControls = React.useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      setCanScrollBackward(false);
      setCanScrollForward(false);
      return;
    }

    const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
    const scrollLeft = Math.max(0, scroller.scrollLeft);

    setCanScrollBackward(scrollLeft > 2);
    setCanScrollForward(scrollLeft < maxScrollLeft - 2);
  }, []);

  const scrollTickerStrip = React.useCallback(
    (direction: "backward" | "forward") => {
      const scroller = scrollerRef.current;
      if (!scroller) return;

      scroller.scrollBy({
        behavior: "smooth",
        left:
          (direction === "forward" ? 1 : -1) *
          Math.max(280, scroller.clientWidth * 0.72),
      });
      window.setTimeout(updateScrollControls, 220);
    },
    [updateScrollControls],
  );
  const handleScrollerKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        scrollTickerStrip("forward");
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        scrollTickerStrip("backward");
        return;
      }

      const scroller = scrollerRef.current;
      if (!scroller) return;

      if (event.key === "Home") {
        event.preventDefault();
        scroller.scrollTo({ behavior: "smooth", left: 0 });
        window.setTimeout(updateScrollControls, 220);
        return;
      }

      if (event.key === "End") {
        event.preventDefault();
        scroller.scrollTo({
          behavior: "smooth",
          left: scroller.scrollWidth,
        });
        window.setTimeout(updateScrollControls, 220);
      }
    },
    [scrollTickerStrip, updateScrollControls],
  );

  React.useEffect(() => {
    setMenuOpen(false);
  }, [marketScope.id]);

  React.useEffect(() => {
    updateScrollControls();
  }, [tickers, updateScrollControls]);

  React.useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    scroller.addEventListener("scroll", updateScrollControls, {
      passive: true,
    });
    window.addEventListener("resize", updateScrollControls);

    return () => {
      scroller.removeEventListener("scroll", updateScrollControls);
      window.removeEventListener("resize", updateScrollControls);
    };
  }, [updateScrollControls]);

  React.useEffect(() => {
    if (!menuOpen) return;

    setActiveIndex(selectedIndex);
    window.setTimeout(() => {
      optionRefs.current[selectedIndex]?.focus();
    });
  }, [menuOpen, selectedIndex]);

  React.useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);

    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [menuOpen]);

  const selectScope = React.useCallback(
    (scopeId: MarketNewsMarketScopeId) => {
      setMenuOpen(false);
      onMarketScopeChange(scopeId);
      buttonRef.current?.focus();
    },
    [onMarketScopeChange],
  );

  const moveActiveOption = React.useCallback(
    (nextIndex: number) => {
      const clampedIndex = Math.min(
        Math.max(nextIndex, 0),
        marketScopes.length - 1,
      );

      setActiveIndex(clampedIndex);
      optionRefs.current[clampedIndex]?.focus();
    },
    [marketScopes.length],
  );

  const handleScopeButtonKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (
        event.key === "ArrowDown" ||
        event.key === "Enter" ||
        event.key === " "
      ) {
        event.preventDefault();
        setMenuOpen(true);
      }
    },
    [],
  );

  const handleScopeMenuKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
        buttonRef.current?.focus();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveActiveOption(activeIndex + 1);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveActiveOption(activeIndex - 1);
        return;
      }

      if (event.key === "Home") {
        event.preventDefault();
        moveActiveOption(0);
        return;
      }

      if (event.key === "End") {
        event.preventDefault();
        moveActiveOption(marketScopes.length - 1);
      }
    },
    [activeIndex, marketScopes.length, moveActiveOption],
  );

  return (
    <section aria-label="Market movers" className={styles.marketMoverStrip}>
      <div className={styles.scopePicker} ref={pickerRef}>
        <button
          ref={buttonRef}
          type="button"
          aria-controls={menuOpen ? menuId : undefined}
          aria-expanded={menuOpen}
          aria-haspopup="listbox"
          aria-label={`Quote snapshot scope: ${marketScope.label}`}
          title="Changes the quote snapshots only. Search and categories control the news feed."
          onClick={() => setMenuOpen((open) => !open)}
          onKeyDown={handleScopeButtonKeyDown}
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
            onKeyDown={handleScopeMenuKeyDown}
            className={styles.scopeMenu}
          >
            {marketScopes.map((scope, index) => {
              const selected = scope.id === marketScope.id;

              return (
                <button
                  key={scope.id}
                  ref={(node) => {
                    optionRefs.current[index] = node;
                  }}
                  type="button"
                  role="option"
                  aria-label={scope.label}
                  aria-selected={selected}
                  tabIndex={index === activeIndex ? 0 : -1}
                  onClick={() => selectScope(scope.id)}
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
        <div className={styles.tickerViewport}>
          <button
            type="button"
            aria-label="Scroll quote snapshots left"
            className={cn(styles.tickerScrollButton, FIT_FOCUS_VISIBLE)}
            disabled={!canScrollBackward}
            onClick={() => scrollTickerStrip("backward")}
          >
            <ChevronLeftRoundedIcon sx={{ fontSize: 20 }} aria-hidden="true" />
          </button>

          <div
            ref={scrollerRef}
            className={styles.tickerScroller}
            aria-label={`${marketScope.label} quote snapshots`}
            tabIndex={0}
            onKeyDown={handleScrollerKeyDown}
          >
            {tickers.map((ticker) => (
              <article
                key={ticker.symbol}
                aria-label={`${ticker.symbol} ${ticker.label} quote snapshot${
                  ticker.signal ? `, ${ticker.signal}` : ""
                }`}
                className={styles.tickerCard}
              >
                <span className={styles.tickerText}>
                  <span className={styles.tickerLabelRow}>
                    <span className={styles.tickerSymbol}>
                      {ticker.symbol}
                    </span>
                    {ticker.signal && ticker.signal !== "Core" ? (
                      <span className={styles.tickerSignalBadge}>
                        {ticker.signal}
                      </span>
                    ) : null}
                  </span>
                  <span className={styles.tickerLabel}>{ticker.label}</span>
                  <span className={styles.tickerValue}>{ticker.value}</span>
                  <span
                    className={`${styles.tickerChange} ${toneClass[ticker.tone]}`}
                  >
                    {ticker.change}
                  </span>
                </span>
                <span
                  className={`${styles.tickerSpark} ${toneClass[ticker.tone]}`}
                >
                  <MarketNewsSparkline
                    data={ticker.sparkline}
                    height={30}
                    width={88}
                  />
                </span>
              </article>
            ))}
          </div>

          <button
            type="button"
            aria-label="Scroll quote snapshots right"
            className={cn(styles.tickerScrollButton, FIT_FOCUS_VISIBLE)}
            disabled={!canScrollForward}
            onClick={() => scrollTickerStrip("forward")}
          >
            <ChevronRightRoundedIcon
              sx={{ fontSize: 20 }}
              aria-hidden="true"
            />
          </button>
        </div>

        <span
          className={styles.marketMoverMeta}
          aria-live="polite"
          title={warning}
        >
          {sourceStatusLabel}
        </span>
      </div>
    </section>
  );
}
