import Link from "next/link";
import type { HomeRouteLink } from "../types";
import styles from "../styles/home.module.css";

export function HomeFooter({
  links,
}: {
  links: HomeRouteLink[];
}) {
  return (
    <footer className={styles.footer}>
      <div>
        <strong>FIT</strong>
        <p>Financial Investment Tool</p>
      </div>
      <nav aria-label="Footer">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={styles.footerLink}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <p>© 2026 FIT. All rights reserved.</p>
    </footer>
  );
}
