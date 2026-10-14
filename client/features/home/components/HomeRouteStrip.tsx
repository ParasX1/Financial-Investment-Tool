import type { HomeRouteLink } from "../types";
import { HomeRouteAction } from "./HomeRouteAction";
import styles from "../styles/home.module.css";

const purposes = {
  "/Portfolio": "Performance and risk",
  "/Watchlist": "Companies and notes",
  "/MarketNews": "Source and context",
  "/Community": "Ideas and reasoning",
};

export function HomeRouteStrip({
  routes,
  authLoading,
  signedIn,
  onRouteSelect,
}: {
  routes: readonly HomeRouteLink[];
  authLoading: boolean;
  signedIn: boolean;
  onRouteSelect: (route: HomeRouteLink) => void;
}) {
  return (
    <nav className={styles.routeStrip} aria-label="Explore FIT features">
      {routes.map((route) => (
        <HomeRouteAction
          key={route.href}
          route={route}
          label={`Open ${route.label}`}
          className={styles.stripAction}
          authLoading={authLoading}
          signedIn={signedIn}
          onRouteSelect={onRouteSelect}
        >
          <span>
            {route.label}
            <small>{purposes[route.href]}</small>
          </span>
        </HomeRouteAction>
      ))}
    </nav>
  );
}
