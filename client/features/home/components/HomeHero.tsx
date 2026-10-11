import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import Link from "next/link";
import { homeHeroActions } from "../data/homeContent";
import { HomePortfolioPreview } from "./HomePortfolioPreview";
import styles from "../styles/home.module.css";

export function HomeHero({
  authLoading,
  signedIn,
  onSignIn,
  onGetStarted,
}: {
  authLoading: boolean;
  signedIn: boolean;
  onSignIn: () => void;
  onGetStarted: () => void;
}) {
  return (
    <section id="top" className={styles.hero} aria-labelledby="home-hero-title">
      <div className={styles.heroContent}>
        <p className={styles.eyebrow}>Financial Investment Tool</p>
        <h1 id="home-hero-title" className={styles.heroTitle}>
          See your investments in perspective.
        </h1>
        <p className={styles.heroSubtitle}>
          Bring portfolio performance, market context and research into one
          clear workspace.
        </p>

        <div className={styles.heroActions}>
          {signedIn ? (
            <Link href="/Portfolio" className={styles.primaryButton}>
              Open portfolio
              <KeyboardArrowRightRoundedIcon
                sx={{ fontSize: 18 }}
                aria-hidden="true"
              />
            </Link>
          ) : (
            <>
              <button
                type="button"
                className={styles.primaryButton}
                disabled={authLoading}
                onClick={onGetStarted}
              >
                {homeHeroActions.primary}
                <KeyboardArrowRightRoundedIcon
                  sx={{ fontSize: 18 }}
                  aria-hidden="true"
                />
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                disabled={authLoading}
                onClick={onSignIn}
              >
                Sign in
              </button>
            </>
          )}
        </div>
        <a href="#experience" className={styles.heroExplore}>
          {homeHeroActions.secondary}
          <KeyboardArrowRightRoundedIcon
            sx={{ fontSize: 17 }}
            aria-hidden="true"
          />
        </a>
      </div>
      <HomePortfolioPreview />
    </section>
  );
}
