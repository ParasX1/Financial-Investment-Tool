import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import { FitLogo } from "@/components/shared/FitLogo";
import Link from "next/link";
import styles from "../styles/home.module.css";

export function HomeNavigation({
  loading,
  signedIn,
  onSignIn,
}: {
  loading: boolean;
  signedIn: boolean;
  onSignIn: () => void;
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
            wordmarkClassName={styles.brandWordmark}
          />
        </a>

        <div className={styles.navActions}>
          {signedIn ? (
            <Link
              href="/Portfolio"
              className={styles.navPrimary}
            >
              Dashboard
              <KeyboardArrowRightRoundedIcon
                sx={{ fontSize: 17 }}
                aria-hidden="true"
              />
            </Link>
          ) : (
            <button
              type="button"
              className={styles.navSecondary}
              disabled={loading}
              onClick={onSignIn}
            >
              <LoginRoundedIcon sx={{ fontSize: 16 }} aria-hidden="true" />
              Sign in
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}
