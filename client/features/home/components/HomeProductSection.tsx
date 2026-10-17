import { homeTools } from "../data/homeContent";
import type { HomeEntryActions } from "../types";
import { HomePortfolioPreview } from "./HomePortfolioPreview";
import { HomeRouteAction } from "./HomeRouteAction";
import { HomeTaskSection } from "./HomeTaskSection";
import styles from "../styles/home.module.css";

export function HomeProductSection(entryActions: HomeEntryActions) {
  const portfolio = homeTools["/Portfolio"];

  return (
    <section
      id="product"
      className={styles.productSection}
      aria-label="Explore FIT products"
    >
      <section
        id="analyse"
        className={styles.analysisChapter}
        aria-labelledby="home-analyse-title"
      >
        <header className={styles.chapterHeader}>
          <p className={styles.chapterLabel}>Portfolio research</p>
          <h2 id="home-analyse-title">Analyse an idea</h2>
          <p className={styles.chapterSummary}>
            Look beyond the final return. Understand how a company performed,
            and the risk along the way.
          </p>
        </header>

        <article aria-labelledby="home-portfolio-title">
          <div className={styles.portfolioIntro}>
            <div>
              <h3 id="home-portfolio-title">{portfolio.label}</h3>
              <p className={styles.featureStatement}>{portfolio.tagline}</p>
            </div>
            <div className={styles.chapterDetail}>
              <p className={styles.chapterDescription}>
                {portfolio.description}
              </p>
              <HomeRouteAction
                {...entryActions}
                route={portfolio}
                label={portfolio.actionLabel}
                className={styles.routeTile}
              />
            </div>
          </div>
          <HomePortfolioPreview />
        </article>
      </section>

      <HomeTaskSection {...entryActions} />
    </section>
  );
}
