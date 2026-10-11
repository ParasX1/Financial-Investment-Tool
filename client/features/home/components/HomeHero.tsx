import Image from "next/image";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import Link from "next/link";
import graphsImage from "@/assets/graphs.png";
import { homeHeroActions } from "../data/homeContent";
import styles from "../styles/home.module.css";

export function HomeHero({
  authLoading,
  signedIn,
  onSignIn,
}: {
  authLoading: boolean;
  signedIn: boolean;
  onSignIn: () => void;
}) {
  return (
    <section id="top" className={styles.hero} aria-labelledby="home-hero-title">
      <div className={styles.heroContent}>
        <p className={styles.eyebrow}>Research with perspective</p>
        <h1 id="home-hero-title" className={styles.heroTitle}>
          Learn how investment decisions come together.
        </h1>
        <p className={styles.heroSubtitle}>
          Review portfolio data, put market news in context, and understand
          unfamiliar metrics at your own pace before forming a view.
        </p>

        <div className={styles.heroActions}>
          {signedIn ? (
            <Link href="/Portfolio" className={styles.primaryButton}>
              Open dashboard
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
              onClick={onSignIn}
            >
              {homeHeroActions.primary}
              <KeyboardArrowRightRoundedIcon
                sx={{ fontSize: 18 }}
                aria-hidden="true"
              />
            </button>
          )}
          <a href="#experience" className={styles.secondaryButton}>
            {homeHeroActions.secondary}
          </a>
        </div>
      </div>
      <div className={styles.heroVisual} aria-hidden="true">
        <div className={styles.visualHeading}>
          <span>THE RESEARCH WORKSPACE</span>
          <span>FIT</span>
        </div>
        <div className={styles.visualPlot}>
          <Image
            className={styles.heroImage}
            src={graphsImage}
            alt=""
            priority
          />
          <div className={styles.heroShade} />
          <span className={styles.visualCaption}>
            Questions before conclusions.
          </span>
        </div>
        <div className={styles.visualSteps}>
          <div>
            <span>01</span>
            <strong>Observe</strong>
            <p>Read the evidence</p>
          </div>
          <div>
            <span>02</span>
            <strong>Compare</strong>
            <p>Keep context close</p>
          </div>
          <div>
            <span>03</span>
            <strong>Understand</strong>
            <p>Develop your view</p>
          </div>
        </div>
      </div>
    </section>
  );
}
