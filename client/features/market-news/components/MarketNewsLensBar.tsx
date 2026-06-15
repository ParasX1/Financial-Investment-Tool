import { FIT_FOCUS_VISIBLE, cn } from "@/components/shared/uiPrimitives";
import type { MarketNewsLensId, MarketNewsLensOption } from "../types";
import styles from "../styles/marketNews.module.css";

export function MarketNewsLensBar({
  activeLensId,
  options,
  onLensChange,
}: {
  activeLensId: MarketNewsLensId;
  options: readonly MarketNewsLensOption[];
  onLensChange: (lensId: MarketNewsLensId) => void;
}) {
  return (
    <section className={styles.lensPanel} aria-label="Trader news lens">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase text-[var(--fit-color-text-label)]">
          Trader lens
        </p>
        <p className="mt-1 text-sm leading-6 text-[var(--fit-color-text-body)]">
          Filter headlines by portfolio relevance, ticker linkage, match
          strength, and sentiment.
        </p>
      </div>
      <div className={styles.lensGrid} role="list">
        {options.map((option) => {
          const active = option.id === activeLensId;

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => onLensChange(option.id)}
              className={cn(
                styles.lensButton,
                active ? styles.lensButtonActive : "",
                FIT_FOCUS_VISIBLE,
              )}
              title={option.description}
            >
              <span className={styles.lensLabel}>{option.label}</span>
              <span className={styles.lensCount}>{option.count}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
