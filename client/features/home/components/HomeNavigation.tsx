import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import Link from "next/link";
import type { HomeNavItem } from "../types";
import styles from "../styles/home.module.css";

export function HomeNavigation({
  loading,
  navItems,
  signedIn,
  onSignIn,
}: {
  loading: boolean;
  navItems: HomeNavItem[];
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
          <span className={styles.brandMark} aria-hidden="true">
            F
          </span>
          <span>FIT</span>
        </a>

        <div className={styles.navLinks} aria-label="Front page sections">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={item.href}
              className={styles.navLink}
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className={styles.navActions}>
          {signedIn ? (
            <Link
              href="/dashboardView"
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
