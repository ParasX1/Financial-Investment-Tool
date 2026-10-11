import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import Link from "next/link";
import type { HomeEntryDestination, HomeRouteLink } from "../types";
import styles from "../styles/home.module.css";

const chapters: Record<
  HomeEntryDestination,
  { label: string; title: string; action: string }
> = {
  "/Portfolio": {
    label: "Portfolio",
    title: "See performance and risk together.",
    action: "Explore portfolio",
  },
  "/MarketNews": {
    label: "Market context",
    title: "Look beyond the headline.",
    action: "Read market news",
  },
  "/Community": {
    label: "Research",
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
      aria-labelledby="home-product-title"
    >
      <div className={styles.sectionIntro}>
        <h2 id="home-product-title">
          More context.
          <br />A clearer question.
        </h2>
        <p>Three ways to explore the evidence behind an investment decision.</p>
      </div>

      <div className={styles.routeGrid}>
        {routes.map((route, index) => {
          const locked = Boolean(route.gated && !signedIn);
          const chapter = chapters[route.href];
          const entryContent = (
            <>
              {chapter.action}
              {locked ? (
                <LockOutlinedIcon sx={{ fontSize: 14 }} aria-hidden="true" />
              ) : null}
              <KeyboardArrowRightRoundedIcon
                sx={{ fontSize: 18 }}
                aria-hidden="true"
              />
            </>
          );

          return (
            <article key={route.href} className={styles.routeChapter}>
              <p className={styles.chapterLabel}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {chapter.label}
              </p>
              <h3>{chapter.title}</h3>
              <p className={styles.chapterDescription}>{route.description}</p>
              {locked ? (
                <button
                  type="button"
                  className={styles.routeTile}
                  aria-label={`${chapter.action}, sign in required`}
                  disabled={authLoading}
                  onClick={() => onRouteSelect(route)}
                >
                  {entryContent}
                </button>
              ) : (
                <Link href={route.href} className={styles.routeTile}>
                  {entryContent}
                </Link>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
