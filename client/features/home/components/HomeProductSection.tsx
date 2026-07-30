import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import Link from "next/link";
import type { HomeRouteLink } from "../types";
import styles from "../styles/home.module.css";

export function HomeProductSection({
  authLoading,
  routes,
  signedIn,
  onRouteSelect,
}: {
  authLoading: boolean;
  routes: readonly HomeRouteLink[];
  signedIn: boolean;
  onRouteSelect: (route: HomeRouteLink) => void;
}) {
  return (
    <section
      id="product"
      className={styles.productSection}
      aria-labelledby="home-product-title"
    >
      <div className={styles.sectionIntro}>
        <p className={styles.eyebrow}>Explore FIT</p>
        <h2 id="home-product-title">Start with the questions that matter.</h2>
      </div>

      <div className={styles.routeGrid}>
        {routes.map((route) => {
          const Icon = route.icon;
          const locked = Boolean(route.gated && !signedIn);
          const tileContent = (
            <>
              <span className={styles.routeIcon} aria-hidden="true">
                {Icon ? <Icon sx={{ fontSize: 19 }} /> : null}
              </span>
              <span className={styles.routeBody}>
                <strong>{route.label}</strong>
                <span>{route.description}</span>
              </span>
              <span className={styles.routeAction} aria-hidden="true">
                {locked ? <LockOutlinedIcon sx={{ fontSize: 15 }} /> : null}
                <KeyboardArrowRightRoundedIcon sx={{ fontSize: 20 }} />
              </span>
            </>
          );

          if (!locked) {
            return (
              <Link
                key={route.href}
                href={route.href}
                className={styles.routeTile}
              >
                {tileContent}
              </Link>
            );
          }

          return (
            <button
              key={route.href}
              type="button"
              className={styles.routeTile}
              aria-label={`${route.label} requires sign in`}
              disabled={authLoading}
              onClick={() => onRouteSelect(route)}
            >
              {tileContent}
            </button>
          );
        })}
      </div>
    </section>
  );
}
