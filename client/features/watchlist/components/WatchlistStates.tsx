import BookmarkBorderRoundedIcon from "@mui/icons-material/BookmarkBorderRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { FIT_FOCUS_VISIBLE, cn } from "@/components/shared/uiPrimitives";
import styles from "../styles/watchlist.module.css";

export function WatchlistLoadingState() {
  return (
    <section className={styles.statePanel} aria-busy="true" aria-live="polite">
      <div className={styles.skeletonIcon} aria-hidden="true" />
      <p className={styles.stateEyebrow}>Preparing your research list</p>
      <h2 className={styles.stateTitle}>Loading your watchlist…</h2>
      <p className={styles.stateCopy}>Checking your saved companies and latest quotes.</p>
    </section>
  );
}

export function WatchlistLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section className={styles.statePanel} role="alert">
      <span className={styles.stateIcon} aria-hidden="true"><ErrorOutlineRoundedIcon /></span>
      <p className={styles.stateEyebrow}>Watchlist unavailable</p>
      <h2 className={styles.stateTitle}>Your saved ideas are still safe</h2>
      <p className={styles.stateCopy}>{message}</p>
      <button type="button" className={cn(styles.primaryButton, FIT_FOCUS_VISIBLE)} onClick={onRetry}>
        Try again
      </button>
    </section>
  );
}

export function WatchlistSignedOut({ onCreateAccount, onSignIn }: { onCreateAccount: () => void; onSignIn: () => void }) {
  return (
    <section className={styles.statePanel}>
      <span className={styles.stateIcon} aria-hidden="true"><LockOutlinedIcon /></span>
      <p className={styles.stateEyebrow}>Personal research</p>
      <h2 className={styles.stateTitle}>Sign in to save a watchlist</h2>
      <p className={styles.stateCopy}>
        Keep companies you want to learn about, add a short reason, and return to the same list on any device.
      </p>
      <div className={styles.stateActions}>
        <button type="button" className={cn(styles.primaryButton, FIT_FOCUS_VISIBLE)} onClick={onSignIn}>Sign in</button>
        <button type="button" className={cn(styles.secondaryButton, FIT_FOCUS_VISIBLE)} onClick={onCreateAccount}>Create account</button>
      </div>
    </section>
  );
}

export function WatchlistEmptyState() {
  return (
    <section className={styles.statePanel}>
      <span className={styles.stateIcon} aria-hidden="true"><BookmarkBorderRoundedIcon /></span>
      <p className={styles.stateEyebrow}>Start with one idea</p>
      <h2 className={styles.stateTitle}>Build your research shortlist</h2>
      <p className={styles.stateCopy}>
        Search for a company or ticker above, then record why it interests you. A watchlist supports research; it is not a buy recommendation.
      </p>
    </section>
  );
}
