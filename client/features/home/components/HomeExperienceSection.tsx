import Link from "next/link";
import styles from "../styles/home.module.css";

export function HomeExperienceSection() {
  return (
    <section
      id="experience"
      className={styles.editorialRow}
      aria-labelledby="home-experience-title"
    >
      <div className={styles.chapterIntro}>
        <p className={styles.chapterLabel}>
          <span>05</span>Guide
        </p>
        <h2 id="home-experience-title">Get to know the measures.</h2>
        <div className={styles.chapterDetail}>
          <p className={styles.chapterDescription}>
            New to portfolio analytics? Start with the tools and the measures,
            with explanations you can return to as you learn.
          </p>
          <div className={styles.guideLinks}>
            <Link href="/Guide" className={styles.heroExplore}>
              Read the guide <span aria-hidden="true">↗</span>
            </Link>
            <Link href="/Help" className={styles.helpLink}>
              Visit Help Center <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
