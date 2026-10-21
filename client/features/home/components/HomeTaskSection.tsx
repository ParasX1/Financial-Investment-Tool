import type { ReactNode } from "react";
import Link from "next/link";
import { homeTools } from "../data/homeContent";
import type { HomeEntryActions } from "../types";
import { HomeRouteAction } from "./HomeRouteAction";
import styles from "../styles/HomeTasks.module.css";
import homeStyles from "../styles/home.module.css";

function TaskLane({
  id,
  label,
  title,
  description,
  children,
}: {
  id: string;
  label: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const titleId = `home-${id}-title`;

  return (
    <article id={id} className={styles.taskRow} aria-labelledby={titleId}>
      <p className={styles.taskLabel}>{label}</p>
      <div className={styles.taskBody}>
        <h3 id={titleId}>{title}</h3>
        <p className={styles.taskDescription}>{description}</p>
      </div>
      <div className={styles.taskActions}>{children}</div>
    </article>
  );
}

export function HomeTaskSection(entryActions: HomeEntryActions) {
  const topPicks = homeTools["/TopPicks"];
  const watchlist = homeTools["/Watchlist"];
  const marketNews = homeTools["/MarketNews"];
  const community = homeTools["/Community"];

  return (
    <>
      <section
        id="research-tasks"
        className={styles.tasks}
        aria-labelledby="home-tasks-title"
      >
        <header className={styles.taskHeader}>
          <h2 id="home-tasks-title">What would you like to do?</h2>
        </header>
        <div className={styles.taskList}>
          <TaskLane
            id="discover"
            label="Discover"
            title="Find a company to research"
            description="Sort return and risk measures across time windows."
          >
            <HomeRouteAction
              {...entryActions}
              route={topPicks}
              label={topPicks.actionLabel}
              className={styles.taskRoute}
            >
              {topPicks.label}
            </HomeRouteAction>
          </TaskLane>
          <TaskLane
            id="follow"
            label="Follow"
            title="Follow your research"
            description="Keep company notes in Watchlist, or read market coverage with its source and date."
          >
            <HomeRouteAction
              {...entryActions}
              route={watchlist}
              label={watchlist.actionLabel}
              className={styles.taskRoute}
            >
              {watchlist.label}
            </HomeRouteAction>
            <HomeRouteAction
              {...entryActions}
              route={marketNews}
              label={marketNews.actionLabel}
              className={styles.taskRoute}
            >
              {marketNews.label}
            </HomeRouteAction>
          </TaskLane>
          <TaskLane
            id="experience"
            label="Understand"
            title="Understand what you find"
            description="Look up FIT’s terms and measures, or discuss your research with others."
          >
            <Link
              href="/Guide"
              className={styles.taskRoute}
              aria-label="Read the guide"
            >
              Guide <span aria-hidden="true">→</span>
            </Link>
            <HomeRouteAction
              {...entryActions}
              route={community}
              label={community.actionLabel}
              className={styles.taskRoute}
            >
              {community.label}
            </HomeRouteAction>
          </TaskLane>
        </div>
      </section>
      <aside className={homeStyles.helpRow} aria-label="Help and support">
        <p>Need a hand with FIT?</p>
        <p>Find answers about accounts, tools and getting around.</p>
        <Link href="/Help" className={homeStyles.helpLink}>
          Visit Help Center <span aria-hidden="true">↗</span>
        </Link>
      </aside>
    </>
  );
}
