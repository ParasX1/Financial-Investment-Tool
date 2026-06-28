import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LockOpenRoundedIcon from "@mui/icons-material/LockOpenRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import MarkEmailUnreadRoundedIcon from "@mui/icons-material/MarkEmailUnreadRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { PROFILE_SUPPORT_CARDS } from "../data/profileSections";
import styles from "../styles/profile.module.css";

export function ProfileStatusRail({
  emailVerified,
  hasPendingEmailChange,
  isEditing,
}: {
  emailVerified: boolean;
  hasPendingEmailChange: boolean;
  isEditing: boolean;
}) {
  return (
    <aside className={styles.rail} aria-label="Profile guidance">
      <section
        className={styles.supportCard}
        aria-labelledby="profile-status-title"
      >
        <h2 id="profile-status-title" className={styles.supportTitle}>
          Account status
        </h2>
        <div className={`${styles.statusGrid} mt-3`}>
          <StatusItem
            icon={isEditing ? LockOpenRoundedIcon : LockRoundedIcon}
            label="Edit mode"
            value={isEditing ? "Editing unlocked" : "Editing locked"}
          />
          <StatusItem
            icon={
              emailVerified
                ? CheckCircleRoundedIcon
                : MarkEmailUnreadRoundedIcon
            }
            label="Verification"
            value={
              emailVerified
                ? "Email verified"
                : hasPendingEmailChange
                  ? "Email change pending"
                  : "Email pending"
            }
          />
        </div>
      </section>

      {PROFILE_SUPPORT_CARDS.map((card) => {
        const Icon =
          card.id === "privacy" ? InfoOutlinedIcon : ShieldRoundedIcon;

        return (
          <section key={card.id} className={styles.supportCard}>
            <div className="flex min-w-0 items-start gap-3">
              <span className={styles.statusIcon} aria-hidden="true">
                <Icon sx={{ fontSize: 18 }} />
              </span>
              <div className="min-w-0">
                <h2 className={styles.supportTitle}>{card.title}</h2>
                <p className={styles.supportBody}>{card.body}</p>
              </div>
            </div>
          </section>
        );
      })}

      {!emailVerified ? (
        <section className={styles.supportCard}>
          <div className="flex min-w-0 items-start gap-3">
            <span className={styles.statusIcon} aria-hidden="true">
              <WarningAmberRoundedIcon sx={{ fontSize: 18 }} />
            </span>
            <div className="min-w-0">
              <h2 className={styles.supportTitle}>Verification needed</h2>
              <p className={styles.supportBody}>
                {hasPendingEmailChange
                  ? "Verify the new inbox before FIT switches your sign-in email."
                  : "Verify your email before relying on account recovery or email change confirmations."}
              </p>
            </div>
          </div>
        </section>
      ) : null}
    </aside>
  );
}

function StatusItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CheckCircleRoundedIcon;
  label: string;
  value: string;
}) {
  return (
    <div className={styles.statusItem}>
      <span className={styles.statusIcon} aria-hidden="true">
        <Icon sx={{ fontSize: 18 }} />
      </span>
      <div className="min-w-0">
        <span className={styles.detailLabel}>{label}</span>
        <span className={styles.detailValue}>{value}</span>
      </div>
    </div>
  );
}
