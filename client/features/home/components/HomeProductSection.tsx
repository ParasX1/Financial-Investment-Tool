import { homeTools } from "../data/homeContent";
import type { HomeEntryActions } from "../types";
import { HomeExperienceSection } from "./HomeExperienceSection";
import { HomePortfolioPreview } from "./HomePortfolioPreview";
import { HomeRouteAction } from "./HomeRouteAction";
import {
  HomeNewsProof,
  HomeTopPicksProof,
  HomeWatchlistProof,
} from "./HomeToolProofs";
import styles from "../styles/home.module.css";

export function HomeProductSection(entryActions: HomeEntryActions) {
  const portfolio = homeTools["/Portfolio"];
  const topPicks = homeTools["/TopPicks"];
  const watchlist = homeTools["/Watchlist"];
  const marketNews = homeTools["/MarketNews"];

  return (
    <section
      id="product"
      className={styles.productSection}
      aria-label="Explore FIT products"
    >
      <nav className={styles.chapterOverview} aria-label="Explore the tools">
        <a href="#analyse" className={styles.chapterJump}>
          <span className={styles.jumpNumber} aria-hidden="true">
            01
          </span>
          <span className={styles.jumpTitle}>Analyse an idea</span>
          <span className={styles.jumpTools}>Portfolio · Top Picks</span>
          <span className={styles.jumpArrow} aria-hidden="true">
            ↓
          </span>
        </a>
        <a href="#follow" className={styles.chapterJump}>
          <span className={styles.jumpNumber} aria-hidden="true">
            02
          </span>
          <span className={styles.jumpTitle}>Follow your research</span>
          <span className={styles.jumpTools}>Watchlist · Market News</span>
          <span className={styles.jumpArrow} aria-hidden="true">
            ↓
          </span>
        </a>
        <a href="#experience" className={styles.chapterJump}>
          <span className={styles.jumpNumber} aria-hidden="true">
            03
          </span>
          <span className={styles.jumpTitle}>Learn and exchange views</span>
          <span className={styles.jumpTools}>Guide · Community</span>
          <span className={styles.jumpArrow} aria-hidden="true">
            ↓
          </span>
        </a>
      </nav>

      <section
        id="analyse"
        className={styles.analysisChapter}
        aria-labelledby="home-analyse-title"
      >
        <header className={styles.chapterHeader}>
          <p className={styles.chapterLabel}>
            <span>01</span>Analysis
          </p>
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

        <article
          className={styles.discoveryStrip}
          aria-labelledby="home-top-picks-title"
        >
          <div>
            <p className={styles.eyebrow}>{topPicks.tagline}</p>
            <h3 id="home-top-picks-title">{topPicks.label}</h3>
          </div>
          <div className={styles.discoveryDetail}>
            <p className={styles.chapterDescription}>{topPicks.description}</p>
            <HomeTopPicksProof />
          </div>
          <HomeRouteAction
            {...entryActions}
            route={topPicks}
            label={topPicks.actionLabel}
            className={styles.routeTile}
          />
        </article>
      </section>

      <section
        id="follow"
        className={styles.taskChapter}
        aria-labelledby="home-follow-title"
      >
        <header className={styles.chapterHeader}>
          <p className={styles.chapterLabel}>
            <span>02</span>Research
          </p>
          <h2 id="home-follow-title">Follow your research</h2>
          <p className={styles.chapterSummary}>
            Keep your own thinking close, and make room for new information.
          </p>
        </header>
        <div className={styles.pairedTools}>
          <article
            className={styles.toolEntry}
            aria-labelledby="home-watchlist-title"
          >
            <p className={styles.toolIntent}>{watchlist.tagline}</p>
            <h3 id="home-watchlist-title">{watchlist.label}</h3>
            <p className={styles.chapterDescription}>{watchlist.description}</p>
            <HomeWatchlistProof />
            <HomeRouteAction
              {...entryActions}
              route={watchlist}
              label={watchlist.actionLabel}
              className={styles.routeTile}
            />
          </article>
          <article
            className={styles.toolEntry}
            aria-labelledby="home-market-news-title"
          >
            <p className={styles.toolIntent}>{marketNews.tagline}</p>
            <h3 id="home-market-news-title">{marketNews.label}</h3>
            <p className={styles.chapterDescription}>
              {marketNews.description}
            </p>
            <HomeNewsProof />
            <HomeRouteAction
              {...entryActions}
              route={marketNews}
              label={marketNews.actionLabel}
              className={styles.routeTile}
            />
          </article>
        </div>
      </section>

      <HomeExperienceSection {...entryActions} />
    </section>
  );
}
