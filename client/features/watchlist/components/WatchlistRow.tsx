import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import ShowChartRoundedIcon from "@mui/icons-material/ShowChartRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import Link from "next/link";
import { getMarketNewsRouteHref } from "@/features/market-news/lib/marketNewsRouting";
import { FIT_FOCUS_VISIBLE, cn } from "@/components/shared/uiPrimitives";
import type { WatchlistItem, WatchlistQuote } from "../types";
import styles from "../styles/watchlist.module.css";

function formatPrice(value: number | null, currency: string | null) {
  if (value === null) return "—";
  try {
    return new Intl.NumberFormat(undefined, currency ? {
      currency,
      maximumFractionDigits: 2,
      style: "currency",
    } : { maximumFractionDigits: 2 }).format(value);
  } catch {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
  }
}

function changeView(changePercent: number | null) {
  if (changePercent === null) return { className: styles.changeNeutral, label: "Daily change unavailable", text: "—" };
  if (changePercent > 0) return { className: styles.changePositive, label: `Up ${Math.abs(changePercent).toFixed(2)}%`, text: `↑ ${changePercent.toFixed(2)}%` };
  if (changePercent < 0) return { className: styles.changeNegative, label: `Down ${Math.abs(changePercent).toFixed(2)}%`, text: `↓ ${Math.abs(changePercent).toFixed(2)}%` };
  return { className: styles.changeNeutral, label: "Unchanged 0.00%", text: "→ 0.00%" };
}

function marketStateLabel(value: string | null) {
  switch (value?.toUpperCase()) {
    case "REGULAR":
      return "Market open";
    case "PRE":
    case "PREPRE":
      return "Pre-market";
    case "POST":
    case "POSTPOST":
      return "After hours";
    case "CLOSED":
      return "Market closed";
    default:
      return "Market status unavailable";
  }
}

function quoteTimeLabel(value: string | null) {
  if (!value) return "Quote time unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Quote time unavailable";
  return `Quote as of ${new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date)}`;
}

export function WatchlistRow({
  busy,
  canMoveDown,
  canMoveUp,
  isMonitored,
  monitorDisabled = false,
  item,
  onEdit,
  onMonitor,
  onMoveDown,
  onMoveUp,
  onRemove,
  quote,
}: {
  busy: boolean;
  canMoveDown: boolean;
  canMoveUp: boolean;
  isMonitored: boolean;
  monitorDisabled?: boolean;
  item: WatchlistItem;
  onEdit: () => void;
  onMonitor: () => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onRemove: () => void;
  quote?: WatchlistQuote | null;
}) {
  const change = changeView(quote?.changePercent ?? null);
  const companyName = quote?.longName ?? quote?.shortName ?? "Company name unavailable";
  const quotePending = typeof quote === "undefined";
  const quoteAvailable = Boolean(quote && quote.price !== null);

  return (
    <article className={styles.watchlistRow} aria-busy={quotePending || busy}>
      <div className={styles.identityCell}>
        <div className={styles.identityLine}>
          <h3 className={styles.symbol}>{item.symbol}</h3>
          {quote?.exchange ? <span className={styles.exchange}>{quote.exchange}</span> : null}
        </div>
        <p className={styles.companyName}>{companyName}</p>
      </div>

      <div className={styles.quoteCell}>
        <span className={styles.mobileLabel}>Latest price</span>
        <strong className={styles.price}>
          {quotePending
            ? "Loading…"
            : quoteAvailable && quote
              ? formatPrice(quote.price, quote.currency)
              : "Quote unavailable"}
        </strong>
        {quoteAvailable && quote ? <span className={cn(styles.change, change.className)} aria-label={change.label}>{change.text}</span> : null}
        {quoteAvailable && quote ? (
          <span className={styles.quoteMeta}>
            {marketStateLabel(quote.marketState)} · {quoteTimeLabel(quote.quoteTime)}
          </span>
        ) : null}
      </div>

      <div className={styles.researchCell}>
        <span className={styles.mobileLabel}>Research note</span>
        <p className={item.note ? styles.note : styles.noteEmpty}>
          {item.note ?? "Add note"}
        </p>
        {item.targetPrice !== null ? (
          <span className={styles.target}>
            Research target: {formatPrice(item.targetPrice, quote?.currency ?? null)}
          </span>
        ) : null}
      </div>

      <div className={styles.rowActions}>
        <button
          type="button"
          className={cn(
            styles.iconAction,
            isMonitored && styles.monitorActionActive,
            FIT_FOCUS_VISIBLE,
          )}
          onClick={onMonitor}
          disabled={monitorDisabled}
          aria-label={`${isMonitored ? "Remove" : "Add"} ${item.symbol} ${
            isMonitored ? "from" : "to"
          } comparison`}
          aria-controls="watchlist-market-monitor"
          aria-pressed={isMonitored}
          title={
            isMonitored
              ? "Selected for comparison"
              : monitorDisabled
                ? "Compare up to four saved ideas"
                : "Add to market comparison"
          }
        >
          <ShowChartRoundedIcon fontSize="small" aria-hidden="true" />
        </button>
        <Link
          href={getMarketNewsRouteHref({
            tickerSymbol: item.symbol,
          })}
          className={cn(styles.iconAction, FIT_FOCUS_VISIBLE)}
          aria-label={`View news for ${item.symbol}`}
          title="View related news"
        >
          <OpenInNewRoundedIcon fontSize="small" aria-hidden="true" />
        </Link>
        <button type="button" className={cn(styles.iconAction, FIT_FOCUS_VISIBLE)} onClick={onEdit} disabled={busy} aria-label={`Edit ${item.symbol} research note`} title="Edit note and target">
          <EditOutlinedIcon fontSize="small" aria-hidden="true" />
        </button>
        <button type="button" className={cn(styles.iconAction, FIT_FOCUS_VISIBLE)} onClick={onMoveUp} disabled={busy || !canMoveUp} aria-label={`Move ${item.symbol} up`} title="Move up in custom order">
          <KeyboardArrowUpRoundedIcon fontSize="small" aria-hidden="true" />
        </button>
        <button type="button" className={cn(styles.iconAction, FIT_FOCUS_VISIBLE)} onClick={onMoveDown} disabled={busy || !canMoveDown} aria-label={`Move ${item.symbol} down`} title="Move down in custom order">
          <KeyboardArrowDownRoundedIcon fontSize="small" aria-hidden="true" />
        </button>
        <button type="button" className={cn(styles.iconAction, styles.removeAction, FIT_FOCUS_VISIBLE)} onClick={onRemove} disabled={busy} aria-label={`Remove ${item.symbol} from watchlist`} title="Remove from watchlist">
          <DeleteOutlineRoundedIcon fontSize="small" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
