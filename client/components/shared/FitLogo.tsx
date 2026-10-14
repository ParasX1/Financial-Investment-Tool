import { cn } from "./uiPrimitives";
import styles from "./FitLogo.module.css";

type FitLogoSize = "compact" | "small" | "medium" | "large";

// Keep the public mark and favicon geometry in sync; asset parity is tested.
const FIT_MARK_PATH = "M8 4H28V8H22V10H10V15H22V21H10V28H4V8A4 4 0 0 1 8 4Z";

export function FitLogo({
  className,
  decorative = false,
  markClassName,
  showWordmark = false,
  size = "medium",
  subtitle,
  wordmark = "Financial Investment Tool",
  wordmarkClassName,
}: {
  className?: string;
  decorative?: boolean;
  markClassName?: string;
  showWordmark?: boolean;
  size?: FitLogoSize;
  subtitle?: string;
  wordmark?: string;
  wordmarkClassName?: string;
}) {
  const accessibilityProps = decorative
    ? { "aria-hidden": true }
    : showWordmark
      ? {}
      : { "aria-label": "FIT", role: "img" };

  return (
    <span
      className={cn(styles.logo, styles[size], className)}
      translate="no"
      {...accessibilityProps}
    >
      <span className={cn(styles.mark, markClassName)} aria-hidden="true">
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 32 32"
          fill="currentColor"
        >
          <path d={FIT_MARK_PATH} />
        </svg>
      </span>
      {showWordmark ? (
        <span className={cn(styles.wordmark, wordmarkClassName)}>
          <span
            className={cn(
              styles.wordmarkMain,
              wordmark === "FIT" && styles.initials,
            )}
          >
            {wordmark}
          </span>
          {subtitle ? (
            <span className={styles.wordmarkSub}>{subtitle}</span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
