import { FIT_FOCUS_VISIBLE, cn } from "@/components/shared/uiPrimitives";
import type { MarketNewsLensId, MarketNewsLensOption } from "../types";
import styles from "../styles/marketNews.module.css";

const PRIMARY_LENS_IDS = new Set<MarketNewsLensId>([
  "all",
  "watchlist",
  "ticker-linked",
]);

export function MarketNewsLensBar({
  activeLensId,
  options,
  onLensChange,
}: {
  activeLensId: MarketNewsLensId;
  options: readonly MarketNewsLensOption[];
  onLensChange: (lensId: MarketNewsLensId) => void;
}) {
  const visibleOptions = options.filter(
    (option) =>
      PRIMARY_LENS_IDS.has(option.id) ||
      option.count > 0 ||
      option.id === activeLensId,
  );
  const activeOption =
    options.find((option) => option.id === activeLensId) ?? options[0];

  return (
    <section className={styles.lensPanel} aria-label="News signals">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase text-[var(--fit-color-text-label)]">
          Signals
        </p>
        <p className="mt-1 text-sm leading-6 text-[var(--fit-color-text-body)]">
          Watchlist, ticker links, match strength, and market tone.
        </p>
      </div>
      <div className={styles.lensGrid} role="list">
        {visibleOptions.map((option) => {
          const active = option.id === activeLensId;
          const disabled = !active && !option.selectable;
          const title = disabled
            ? `No ${option.label} stories in this view`
            : option.description;

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              disabled={disabled}
              onClick={() => onLensChange(option.id)}
              className={cn(
                styles.lensButton,
                active ? styles.lensButtonActive : "",
                disabled ? styles.lensButtonDisabled : "",
                FIT_FOCUS_VISIBLE,
              )}
              title={title}
            >
              <span className={styles.lensLabel}>
                {option.label}
                <span className="sr-only">: {option.description}</span>
              </span>
              <span className={styles.lensCount}>{option.count}</span>
            </button>
          );
        })}
      </div>
      {activeOption ? (
        <p className={styles.modeDescription}>{activeOption.description}</p>
      ) : null}
    </section>
  );
}
