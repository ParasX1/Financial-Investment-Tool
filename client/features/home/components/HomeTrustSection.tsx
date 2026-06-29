import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import type { HomeTrustSignal } from "../types";
import styles from "../styles/home.module.css";

export function HomeTrustSection({
  signals,
}: {
  signals: HomeTrustSignal[];
}) {
  return (
    <section
      id="trust"
      className={styles.trustSection}
      aria-labelledby="home-trust-title"
    >
      <div className={styles.trustCopy}>
        <p className={styles.eyebrow}>Trust</p>
        <h2 id="home-trust-title">Quiet by design.</h2>
      </div>

      <div className={styles.trustList} aria-label="FIT trust signals">
        {signals.map((signal) => (
          <article key={signal.label} className={styles.trustItem}>
            <LockOutlinedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
            <span>
              <strong>{signal.label}</strong>
              {signal.detail}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
