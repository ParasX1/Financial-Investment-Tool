import { homePreviewMetrics } from "../data/homeContent";
import styles from "../styles/home.module.css";

/** A content illustration, deliberately separate from calculated account data. */
export function HomePortfolioPreview() {
  return (
    <figure className={styles.heroVisual} aria-labelledby="home-preview-title">
      <div className={styles.visualHeading}>
        <span>Portfolio analytics</span>
        <span className={styles.sampleLabel}>Illustrative view</span>
      </div>
      <div className={styles.visualBody}>
        <h2 id="home-preview-title">Return, with the risk beside it.</h2>
        <p className={styles.visualDescription}>
          Compare the path. Understand the trade-offs.
        </p>
        <div className={styles.visualChart}>
          <div className={styles.chartHeading}>
            <h3>Rebased return</h3>
            <span>Historical</span>
          </div>
          <svg
            viewBox="0 0 480 180"
            fill="none"
            className={styles.chartPlot}
            aria-hidden="true"
          >
            <path
              className={styles.chartGrid}
              d="M0 30H480M0 80H480M0 130H480M0 179H480"
            />
            <path
              className={styles.chartBenchmark}
              d="M0 142C22 148 32 128 52 135S88 116 108 121S137 109 156 117S187 91 208 101S245 103 262 87S298 78 318 87S349 62 367 70S409 56 427 65S459 41 480 43"
            />
            <path
              className={styles.chartReturn}
              d="M0 142C21 139 27 105 49 111S79 142 103 122S130 64 154 73S180 107 205 88S229 93 252 66S278 53 303 67S331 45 354 48S381 26 406 34S447 4 480 12"
            />
          </svg>
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
        </div>
        <dl className={styles.previewMetrics}>
          {homePreviewMetrics.map((metric) => (
            <div key={metric.label}>
              <dt>{metric.label}</dt>
              <dd>{metric.classification}</dd>
            </div>
          ))}
        </dl>
        <p className={styles.visualMore}>
          Alpha, VaR and sampled opportunities
        </p>
      </div>
      <figcaption className={styles.visualCaption}>
        An illustration of FIT metrics. No account data or calculated results.
      </figcaption>
    </figure>
  );
}
