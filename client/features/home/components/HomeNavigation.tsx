import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import { FitLogo } from "@/components/shared/FitLogo";
import Link from "next/link";
import styles from "../styles/HomeNavigation.module.css";

export function HomeNavigation({
  loading,
  signedIn,
  onSignIn,
  onGetStarted,
}: {
  loading: boolean;
  signedIn: boolean;
  onSignIn: () => void;
  onGetStarted: () => void;
}) {
  return (
    <header className={styles.navShell}>
      <a href="#main-content" className={styles.skipLink}>
        Skip to content
      </a>
      <nav className={styles.nav} aria-label="Home">
        <a
          href="#top"
          className={styles.brandButton}
          aria-label="Go to FIT home"
        >
          <FitLogo
            decorative
            showWordmark
            size="medium"
            wordmark="FIT"
            markClassName={styles.brandMark}
            wordmarkClassName={styles.brandWordmark}
          />
        </a>

        <div className={styles.navLinks}>
          <a href="#product" className={styles.navExplore}>
            Product
          </a>
          <a href="#research-tasks" className={styles.navExplore}>
            Tools
          </a>
          <Link href="/Guide" className={styles.navExplore}>
            Guide
          </Link>
          <Link href="/Help" className={styles.navExplore}>
            Help
          </Link>
        </div>
        <div className={styles.navActions}>
          {signedIn ? (
            <Link href="/Portfolio" className={styles.navPrimary}>
              <span>Open portfolio</span>
              <KeyboardArrowRightRoundedIcon
                sx={{ fontSize: 17 }}
                aria-hidden="true"
              />
            </Link>
          ) : (
            <>
              <button
                type="button"
                className={styles.navSecondary}
                disabled={loading}
                onClick={onSignIn}
              >
                Sign in
              </button>
              <button
                type="button"
                className={styles.navPrimary}
                disabled={loading}
                onClick={onGetStarted}
              >
                Get started
              </button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
