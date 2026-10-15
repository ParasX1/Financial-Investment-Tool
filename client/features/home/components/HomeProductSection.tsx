import type { HomeEntryDestination, HomeRouteLink } from "../types";
import { HomePortfolioPreview } from "./HomePortfolioPreview";
import { HomeRouteAction } from "./HomeRouteAction";
import styles from "../styles/home.module.css";

const chapters: Record<
  HomeEntryDestination,
  { title: string; action: string }
> = {
  "/Portfolio": {
    title: "Return is only half the story.",
    action: "Explore portfolio",
  },
  "/Watchlist": {
    title: "Your companies. Your notes.",
    action: "Open watchlist",
  },
  "/MarketNews": {
    title: "Market news, with context.",
    action: "Read market news",
  },
  "/Community": {
    title: "Share a view. Hear another.",
    action: "Explore community",
  },
};

export function HomeProductSection({
  authLoading,
  routes,
  signedIn,
  onRouteSelect,
}: {
  routes: readonly HomeRouteLink[];
  authLoading: boolean;
  signedIn: boolean;
  onRouteSelect: (route: HomeRouteLink) => void;
}) {
  return (
    <section
      id="product"
      className={styles.productSection}
      aria-label="Explore FIT products"
    >
      {routes.map((route, index) => {
        const chapter = chapters[route.href];
        const portfolio = route.href === "/Portfolio";
        return (
          <article
            key={route.href}
            className={
              portfolio ? styles.portfolioChapter : styles.editorialRow
            }
            aria-labelledby={`home-product-${index}`}
          >
            <div
              className={
                portfolio ? styles.portfolioIntro : styles.chapterIntro
              }
            >
              <p className={styles.chapterLabel}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {route.label}
              </p>
              <h2 id={`home-product-${index}`}>{chapter.title}</h2>
              <div className={styles.chapterDetail}>
                <p className={styles.chapterDescription}>{route.description}</p>
                <HomeRouteAction
                  route={route}
                  label={chapter.action}
                  className={styles.routeTile}
                  authLoading={authLoading}
                  signedIn={signedIn}
                  onRouteSelect={onRouteSelect}
                />
              </div>
            </div>
            {portfolio ? <HomePortfolioPreview /> : null}
          </article>
        );
      })}
    </section>
  );
}
