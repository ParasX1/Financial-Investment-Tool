import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import Link from "next/link";
import type { HomeRouteLink } from "../types";
import styles from "../styles/home.module.css";

export function HomeProductSection({
  routes,
  signedIn,
  onRouteSelect,
}: {
  routes: HomeRouteLink[];
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
        <div className={styles.sectionMetaLine}>
          <p className={styles.eyebrow}>Product map</p>
          {!signedIn ? (
            <span className={styles.sectionNote}>Sign in required</span>
          ) : null}
        </div>
        <h2 id="home-product-title">Start where the decision is.</h2>
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
                {route.description}
              </span>
              <KeyboardArrowRightRoundedIcon
                sx={{ fontSize: 20 }}
                aria-hidden="true"
              />
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
