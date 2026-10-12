import { homePreviewMetrics } from "../data/homeContent";
import styles from "../styles/home.module.css";

/** A content illustration, deliberately separate from calculated account data. */
export function HomePortfolioPreview() {
  return (
    <figure className={styles.heroVisual} aria-labelledby="home-preview-title">
      <header className={styles.visualHeading}>
        <p className={styles.chapterLabel}>
          <span>01</span>Portfolio
        </p>
        <h2 id="home-preview-title">Portfolio: return and risk.</h2>
      </header>
      <figcaption className={styles.visualCaption}>
        Illustration only. No account data or calculated results.
      </figcaption>
      <div className={styles.visualChart}>
        <h3 className={styles.chartHeading}>Compare the path</h3>
        <svg
          viewBox="0 0 760 180"
          preserveAspectRatio="none"
          fill="none"
          className={styles.chartPlot}
          data-home-chart
          aria-hidden="true"
        >
          <path
            className={styles.chartGrid}
            d="M0 30H760M0 80H760M0 130H760M0 179H760"
          />
          <path
            className={styles.chartBenchmark}
            d="M0 142L48 139L94 126L142 133L190 111L238 116L286 98L334 108L382 92L430 85L478 94L526 79L574 83L622 63L670 70L718 58L760 61"
          />
          <path
            className={styles.chartReturn}
            d="M0 142L48 130L94 102L142 128L190 91L238 73L286 98L334 83L382 98L430 64L478 52L526 72L574 43L622 59L670 27L718 41L760 23"
          />
        </svg>
      </div>
      <dl className={styles.previewMetrics}>
        {homePreviewMetrics.map((metric) => (
          <div key={metric.label}>
            <dt>{metric.label}</dt>
            <dd>{metric.classification}</dd>
          </div>
        ))}
      </dl>
      <div className={styles.chartLegend}>
        <span>
          <i className={styles.returnKey} aria-hidden="true" />
          Selected assets
        </span>
        <span>
          <i className={styles.benchmarkKey} aria-hidden="true" />
          Benchmark
        </span>
      </div>
    </figure>
  );
}
