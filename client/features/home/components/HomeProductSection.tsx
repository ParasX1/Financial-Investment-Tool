import type { HomeEntryDestination, HomeRouteLink } from "../types";
import { HomePortfolioPreview } from "./HomePortfolioPreview";
import { HomeRouteAction } from "./HomeRouteAction";
import styles from "../styles/home.module.css";

const chapters: Record<
  HomeEntryDestination,
  { label: string; title: string; action: string }
> = {
  "/Portfolio": {
    label: "Portfolio",
    title: "Portfolio: return and risk.",
    action: "Explore portfolio",
  },
  "/Watchlist": {
    label: "Watchlist",
    title: "Follow what matters.",
    action: "Open watchlist",
  },
  "/MarketNews": {
    label: "Market context",
    title: "Look beyond the headline.",
    action: "Read market news",
  },
  "/Community": {
    label: "Research community",
    title: "Build a considered view.",
    action: "Explore community",
  },
};

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
      aria-label="Explore FIT products"
    >
      <div className={styles.productGrid}>
        {routes.map((route, index) => {
          const chapter = chapters[route.href];
          const portfolio = route.href === "/Portfolio";
          return (
            <article
              key={route.href}
              className={`${styles.productPanel} ${portfolio ? styles.portfolioPanel : styles.supportingPanel}`}
              aria-labelledby={
                portfolio ? "home-preview-title" : `home-product-${index}`
              }
            >
              {portfolio ? (
                <HomePortfolioPreview />
              ) : (
                <>
                  <p className={styles.chapterLabel}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    {chapter.label}
                  </p>
                  <h2 id={`home-product-${index}`}>{chapter.title}</h2>
                  {route.href === "/Watchlist" ? (
                    <ul className={styles.watchlistPurposes}>
                      <li>Follow a company</li>
                      <li>Keep a research note</li>
                      <li>Revisit your questions</li>
                    </ul>
                  ) : null}
                  <p className={styles.chapterDescription}>
                    {route.description}
                  </p>
                  {route.href === "/MarketNews" ? (
                    <p className={styles.sourcePrompt}>
                      Who published it? When? What does it explain?
                    </p>
                  ) : null}
                  {route.href === "/Community" ? (
                    <ul
                      className={styles.researchPrompts}
                      aria-label="Research prompts"
                    >
                      <li>Evidence</li>
                      <li>Assumptions</li>
                      <li>Open questions</li>
                    </ul>
                  ) : null}
                </>
              )}
              <HomeRouteAction
                route={route}
                label={chapter.action}
                className={styles.routeTile}
                authLoading={authLoading}
                signedIn={signedIn}
                onRouteSelect={onRouteSelect}
              />
            </article>
          );
        })}
      </div>
    </section>
  );
}
