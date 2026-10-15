import { cn } from "./uiPrimitives";
import signature from "./fitSignatureGeometry.json";
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
          viewBox={signature.viewBox}
          fill="currentColor"
        >
          {signature.standard.paths.map((path, index) => (
            <path key={index} d={path} />
          ))}
          <circle {...signature.standard.dot} />
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
