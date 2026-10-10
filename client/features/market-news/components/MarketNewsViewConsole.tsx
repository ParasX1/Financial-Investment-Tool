import * as React from "react";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import { cn, fitText, fitType } from "@/components/shared/uiPrimitives";
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
          <p className={cn(fitType.eyebrow, fitText.label)}>{eyebrow}</p>
          <h2
            className={cn("mt-2 text-balance text-white", fitType.sectionTitle)}
          >
            {title}
          </h2>
          <p
            className={cn(
              "mt-2 max-w-[48rem] text-pretty",
              fitType.body,
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
          <span
            className={styles.feedControlsChips}
            aria-label="Active feed controls"
          >
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
