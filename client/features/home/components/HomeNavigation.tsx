import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import { FitLogo } from "@/components/shared/FitLogo";
import Link from "next/link";
import styles from "../styles/home.module.css";

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
            wordmarkClassName={styles.brandWordmark}
          />
        </a>

        <div className={styles.navActions}>
          <a href="#product" className={styles.navExplore}>
            Explore FIT
          </a>
          {signedIn ? (
            <Link href="/Portfolio" className={styles.navPrimary}>
              Open portfolio
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
