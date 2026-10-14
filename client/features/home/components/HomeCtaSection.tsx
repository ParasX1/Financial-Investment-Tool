import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import Link from "next/link";
import { homeCta } from "../data/homeContent";
import styles from "../styles/home.module.css";

export function HomeCtaSection({
  authLoading,
  signedIn,
  onCreateAccount,
}: {
  authLoading: boolean;
  signedIn: boolean;
  onCreateAccount: () => void;
}) {
  return (
    <section className={styles.ctaSection} aria-labelledby="home-cta-title">
      <div className={styles.ctaCopy}>
        <h2 id="home-cta-title">{homeCta.title}</h2>
        <p>{homeCta.body}</p>
      </div>
      {signedIn ? (
        <Link href="/Portfolio" className={styles.primaryButton}>
          {homeCta.primarySignedIn}
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
          onClick={onCreateAccount}
        >
          {homeCta.primarySignedOut}
          <KeyboardArrowRightRoundedIcon
            sx={{ fontSize: 18 }}
            aria-hidden="true"
          />
        </button>
      )}
    </section>
  );
}
