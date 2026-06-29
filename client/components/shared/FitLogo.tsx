import { cn } from "./uiPrimitives";
import styles from "./FitLogo.module.css";

type FitLogoSize = "compact" | "small" | "medium" | "large";

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
      : { "aria-label": "FIT" };

  return (
    <span
      className={cn(styles.logo, styles[size], className)}
      translate="no"
      {...accessibilityProps}
    >
      <span className={cn(styles.mark, markClassName)} aria-hidden="true">
        FIT
      </span>
      {showWordmark ? (
        <span className={cn(styles.wordmark, wordmarkClassName)}>
          <span className={styles.wordmarkMain}>{wordmark}</span>
          {subtitle ? (
            <span className={styles.wordmarkSub}>{subtitle}</span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
