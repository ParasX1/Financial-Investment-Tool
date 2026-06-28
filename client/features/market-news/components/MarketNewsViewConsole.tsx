import * as React from "react";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import { cn, fitText } from "@/components/shared/uiPrimitives";
import styles from "../styles/marketNews.module.css";

export function MarketNewsViewConsole({
  activeLensLabel,
  activeSortLabel,
  children,
  eyebrow,
  notice,
  summary,
  title,
}: {
  activeLensLabel: string;
  activeSortLabel: string;
  children: React.ReactNode;
  eyebrow: string;
  notice?: string;
  summary: string;
  title: string;
}) {
  return (
    <section className={styles.viewConsole}>
      <div className={styles.viewConsoleHeader}>
        <div className="min-w-0">
          <p className={cn("text-xs font-bold uppercase", fitText.label)}>
            {eyebrow}
          </p>
          <h2 className="mt-2 text-balance text-2xl font-extrabold leading-tight text-white">
            {title}
          </h2>
          <p
            className={cn(
              "mt-2 max-w-[48rem] text-pretty text-[15px] leading-6",
              fitText.body,
            )}
          >
            {summary}
          </p>
          {notice ? (
            <p className={styles.viewNotice} aria-live="polite">
              {notice}
            </p>
          ) : null}
        </div>
      </div>

      <details className={styles.feedControls}>
        <summary className={styles.feedControlsSummary}>
          <span className={styles.feedControlsTitle}>Feed controls</span>
          <span className={styles.feedControlsChips} aria-label="Active feed controls">
            <span>
              <span>Order</span>
              <strong>{activeSortLabel}</strong>
            </span>
            <span>
              <span>Filter</span>
              <strong>{activeLensLabel}</strong>
            </span>
          </span>
          <KeyboardArrowDownRoundedIcon
            aria-hidden="true"
            className={styles.feedControlsChevron}
            sx={{ fontSize: 18 }}
          />
        </summary>

        <div className={styles.feedControlsBody}>{children}</div>
      </details>
    </section>
  );
}
