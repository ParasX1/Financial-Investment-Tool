import { FIT_FOCUS_VISIBLE, cn } from "@/components/shared/uiPrimitives";
import type { MarketNewsSortId, MarketNewsSortOption } from "../types";
import styles from "../styles/marketNews.module.css";

export function MarketNewsScanOrderBar({
  activeSortId,
  options,
  onSortChange,
}: {
  activeSortId: MarketNewsSortId;
  options: readonly MarketNewsSortOption[];
  onSortChange: (sortId: MarketNewsSortId) => void;
}) {
  const activeOption =
    options.find((option) => option.id === activeSortId) ?? options[0];

  return (
    <section className={styles.scanPanel} aria-label="News scan order">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase text-[var(--fit-color-text-label)]">
          Scan order
        </p>
        <p className="mt-1 text-sm leading-6 text-[var(--fit-color-text-body)]">
          Choose how this same story set is ordered.
        </p>
      </div>
      <div className={styles.scanGrid} role="list">
        {options.map((option) => {
          const active = option.id === activeSortId;

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              className={cn(
                styles.scanButton,
                active ? styles.scanButtonActive : "",
                FIT_FOCUS_VISIBLE,
              )}
              title={option.description}
              onClick={() => onSortChange(option.id)}
            >
              <span>{option.label}</span>
              <span className="sr-only">: {option.description}</span>
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
