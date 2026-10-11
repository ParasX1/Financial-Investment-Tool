import Link from "next/link";
import type { HomeExperiencePoint } from "../types";
import styles from "../styles/home.module.css";

export function HomeExperienceSection({
  points,
}: {
  points: readonly HomeExperiencePoint[];
}) {
  return (
    <section
      id="experience"
      className={styles.experienceSection}
      aria-labelledby="home-experience-title"
    >
      <div className={styles.experienceCopy}>
        <p className={styles.eyebrow}>A little more perspective</p>
        <h2 id="home-experience-title">Questions before conclusions.</h2>
        <p>
          A chart is a starting point. Read the risk beside the return, check
          the source and compare ideas before you form a view.
        </p>
        <Link href="/Guide" className={styles.heroExplore}>
          Explore the FIT guide <span aria-hidden="true">↗</span>
        </Link>
      </div>
      <ol className={styles.experienceSteps}>
        {points.map((point, index) => (
          <li key={point.label}>
            <span className={styles.stepNumber} aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <h3>{point.label}</h3>
              <p>{point.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
