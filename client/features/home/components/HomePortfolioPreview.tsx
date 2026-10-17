import { homePreviewMetrics } from "../data/homeContent";
import styles from "../styles/home.module.css";

/** An educational illustration, deliberately separate from account data. */
export function HomePortfolioPreview() {
  return (
    <figure className={styles.heroVisual} aria-labelledby="home-preview-title">
      <figcaption className={styles.visualTopline}>
        <span className={styles.eyebrow}>The portfolio view</span>
        <span className={styles.visualCaption}>
          Illustration only. No account data or calculated results.
        </span>
      </figcaption>
      <div className={styles.visualHeading}>
        <p id="home-preview-title" className={styles.visualTitle}>
          Read the journey, as well as the result.
        </p>
        <p>
          Two paths can finish close together and feel very different along the
          way.
        </p>
      </div>
      <div className={styles.visualChart}>
        <div className={styles.chartLegend}>
          <span>
            <i className={styles.returnKey} aria-hidden="true" />
            Illustrative portfolio
          </span>
          <span>
            <i className={styles.benchmarkKey} aria-hidden="true" />
            Illustrative benchmark
          </span>
        </div>
        <svg
          viewBox="0 0 1200 270"
          preserveAspectRatio="none"
          fill="none"
          className={styles.chartPlot}
          data-home-chart
          aria-hidden="true"
          focusable="false"
        >
          <path
            className={styles.chartGrid}
            d="M0 45H1200M0 120H1200M0 195H1200M0 269H1200"
          />
          <path
            className={styles.chartArea}
            d="M0 220C45 218 62 175 102 187S165 226 215 165S260 196 306 144S354 177 402 113S460 140 505 120S548 88 584 119S625 175 665 154S710 88 750 114S796 157 836 94S880 114 925 70S970 102 1015 68S1060 93 1100 50S1155 69 1200 35V270H0Z"
          />
          <path
            className={styles.chartBenchmark}
            d="M0 220C100 216 170 194 235 186S340 166 410 158S510 142 585 133S700 108 770 110S870 88 945 80S1100 66 1200 46"
          />
          <path
            className={styles.chartReturn}
            d="M0 220C45 218 62 175 102 187S165 226 215 165S260 196 306 144S354 177 402 113S460 140 505 120S548 88 584 119S625 175 665 154S710 88 750 114S796 157 836 94S880 114 925 70S970 102 1015 68S1060 93 1100 50S1155 69 1200 35"
          />
        </svg>
        <div className={styles.chartTimeline} aria-hidden="true">
          <span>Earlier</span>
          <span>Later</span>
        </div>
      </div>
      <dl className={styles.previewMetrics}>
        {homePreviewMetrics.map((metric) => (
          <div key={metric.label}>
            <dt>{metric.label}</dt>
            <dd>{metric.description}</dd>
          </div>
        ))}
      </dl>
    </figure>
  );
}
