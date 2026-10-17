import Link from "next/link";
import { homeTools } from "../data/homeContent";
import type { HomeEntryActions } from "../types";
import { HomeRouteAction } from "./HomeRouteAction";
import styles from "../styles/home.module.css";

export function HomeExperienceSection(entryActions: HomeEntryActions) {
  const community = homeTools["/Community"];

  return (
    <>
      <section
        id="experience"
        className={styles.taskChapter}
        aria-labelledby="home-experience-title"
      >
        <header className={styles.chapterHeader}>
          <p className={styles.chapterLabel}>
            <span>03</span>Learning
          </p>
          <h2 id="home-experience-title">Learn and exchange views</h2>
          <p className={styles.chapterSummary}>
            Get comfortable with the measures, then bring your questions and
            reasoning to the discussion.
          </p>
        </header>
        <div className={styles.pairedTools}>
          <article
            className={styles.toolEntry}
            aria-labelledby="home-guide-title"
          >
            <p className={styles.toolIntent}>Get to know the measures.</p>
            <h3 id="home-guide-title">Guide</h3>
            <p className={styles.chapterDescription}>
              Start with return and risk, learn what the measures mean, and
              return to an explanation when you need it. No account needed.
            </p>
            <Link href="/Guide" className={styles.routeTile}>
              Read the guide <span aria-hidden="true">↗</span>
            </Link>
          </article>
          <article
            className={styles.toolEntry}
            aria-labelledby="home-community-title"
          >
            <p className={styles.toolIntent}>{community.tagline}</p>
            <h3 id="home-community-title">{community.label}</h3>
            <p className={styles.chapterDescription}>{community.description}</p>
            <HomeRouteAction
              {...entryActions}
              route={community}
              label={community.actionLabel}
              className={styles.routeTile}
            />
          </article>
        </div>
      </section>
      <aside className={styles.helpRow} aria-label="Help and support">
        <p>Need a hand with FIT?</p>
        <p>Find answers about accounts, tools and getting around.</p>
        <Link href="/Help" className={styles.helpLink}>
          Visit Help Center <span aria-hidden="true">↗</span>
        </Link>
      </aside>
    </>
  );
}
