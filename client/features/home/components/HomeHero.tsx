import Image from "next/image";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import Link from "next/link";
import graphsImage from "@/assets/graphs.png";
import { homeHeroActions } from "../data/homeContent";
import styles from "../styles/home.module.css";

export function HomeHero({
  signedIn,
  onOpenWorkspace,
}: {
  signedIn: boolean;
  onOpenWorkspace: () => void;
}) {
  return (
    <section id="top" className={styles.hero} aria-labelledby="home-hero-title">
      <Image className={styles.heroImage} src={graphsImage} alt="" priority />
      <div className={styles.heroShade} aria-hidden="true" />

      <div className={styles.heroContent}>
        <p className={styles.eyebrow}>Financial Investment Tool</p>
        <h1 id="home-hero-title" className={styles.heroTitle}>
          Invest with clarity.
        </h1>
        <p className={styles.heroSubtitle}>
          A focused workspace for portfolio analytics, market context, and the
          thinking around every decision.
        </p>

        <div className={styles.heroActions}>
          {signedIn ? (
            <Link href="/dashboardView" className={styles.primaryButton}>
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
              onClick={onOpenWorkspace}
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
    </section>
  );
}
