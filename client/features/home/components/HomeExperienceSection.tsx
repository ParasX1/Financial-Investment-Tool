import Image from "next/image";
import pic1Image from "@/assets/pic1.jpg";
import pic2Image from "@/assets/pic2.jpg";
import teamImage from "@/assets/teamimage.png";
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
        <p className={styles.eyebrow}>Research process</p>
        <h2 id="home-experience-title">A research loop you can repeat.</h2>
        <p>
          Move from observation to evidence, then pause before you form a view.
          The same process works whether you are reviewing a portfolio or
          following a market story.
        </p>

        <div className={styles.experienceGrid}>
          {points.map((point) => {
            const Icon = point.icon;

            return (
              <article key={point.label} className={styles.experiencePoint}>
                <Icon sx={{ fontSize: 18 }} aria-hidden="true" />
                <span>
                  <strong>{point.label}</strong>
                  {point.description}
                </span>
              </article>
            );
          })}
        </div>
      </div>

      <div className={styles.experienceMedia} aria-label="FIT visual context">
        <figure className={styles.mediaFramePrimary}>
          <Image
            src={pic2Image}
            alt="Market chart lines on a trading screen"
            sizes="(max-width: 900px) 100vw, 46vw"
          />
        </figure>
        <figure className={styles.mediaFrameSecondary}>
          <Image
            src={pic1Image}
            alt="Portfolio charts on a tablet"
            sizes="(max-width: 640px) 100vw, (max-width: 900px) 48vw, 20vw"
          />
        </figure>
        <figure className={styles.mediaFrameTertiary}>
          <Image
            src={teamImage}
            alt="Investment discussion illustration"
            sizes="(max-width: 640px) 100vw, (max-width: 900px) 48vw, 18vw"
          />
        </figure>
      </div>
    </section>
  );
}
