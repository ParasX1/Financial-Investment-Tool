import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import Link from "next/link";
import { homeHeroActions } from "../data/homeContent";
import styles from "../styles/home.module.css";

export function HomeHero({
  authLoading,
  signedIn,
  onGetStarted,
}: {
  authLoading: boolean;
  signedIn: boolean;
  onGetStarted: () => void;
}) {
  return (
    <section id="top" className={styles.hero} aria-labelledby="home-hero-title">
      <div className={styles.heroContent}>
        <p className={styles.eyebrow}>Financial Investment Tool</p>
        <h1 id="home-hero-title" className={styles.heroTitle}>
          Understand your portfolio. See the wider market.
        </h1>
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
            </>
          )}
          <Link href="/Guide" className={styles.heroExplore}>
            {homeHeroActions.secondary}
            <KeyboardArrowRightRoundedIcon
              sx={{ fontSize: 17 }}
              aria-hidden="true"
            />
          </Link>
        </div>
        <p className={styles.heroSubtitle}>
          Read historical returns alongside risk, follow market news and compare
          research ideas in one workspace.
        </p>
      </div>
    </section>
  );
}
