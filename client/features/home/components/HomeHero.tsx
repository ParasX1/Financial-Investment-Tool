import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import { FitLogo } from "@/components/shared/FitLogo";
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
        <FitLogo
          decorative
          className={styles.heroLogo}
          markClassName={styles.heroMark}
        />
        <h1 id="home-hero-title" className={styles.heroTitle}>
          Make sense of investing. <span>One company at a time.</span>
        </h1>
        <p className={styles.heroSubtitle}>
          Compare historical return and risk, keep your notes, and explore
          market news—with explanations that help the numbers make sense.
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
          )}
          <a href="#product" className={styles.heroExplore}>
            {homeHeroActions.secondary}
            <span aria-hidden="true">↓</span>
          </a>
        </div>
      </div>
      <div className={styles.signatureField} aria-hidden="true" />
    </section>
  );
}
