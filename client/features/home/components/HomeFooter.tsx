import { FitLogo } from "@/components/shared/FitLogo";
import Link from "next/link";
import type { HomeFooterGroup } from "../types";
import styles from "../styles/home.module.css";

export function HomeFooter({
  groups,
  loading,
  signedIn,
  onSignIn,
}: {
  groups: readonly HomeFooterGroup[];
  loading: boolean;
  signedIn: boolean;
  onSignIn: () => void;
}) {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerBrand}>
        <FitLogo className={styles.footerLogo} decorative size="small" />
        <p>
          Portfolio analytics, market research, and guided learning in one
          workspace.
        </p>
        <p>
          FIT supports research and education. It does not provide personal
          financial advice or execute trades.
        </p>
      </div>

      <div className={styles.footerGroups}>
        {groups.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <strong>{group.title}</strong>
            {group.items.map((item) =>
              item.href.startsWith("#") ? (
                <a
                  key={item.href}
                  href={item.href}
                  className={styles.footerLink}
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={styles.footerLink}
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>
        ))}
        <div className={styles.footerAccount}>
          <strong>Account</strong>
          {signedIn ? (
            <Link href="/Portfolio" className={styles.footerLink}>
              Dashboard
            </Link>
          ) : (
            <button
              type="button"
              className={styles.footerLink}
              disabled={loading}
              onClick={onSignIn}
            >
              Sign in
            </button>
          )}
        </div>
      </div>

      <p className={styles.footerLegal}>© 2026 FIT. All rights reserved.</p>
    </footer>
  );
}
