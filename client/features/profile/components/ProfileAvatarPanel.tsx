import CameraAltRoundedIcon from "@mui/icons-material/CameraAltRounded";
import { FIT_FOCUS_VISIBLE, cn } from "@/components/shared/uiPrimitives";
import styles from "../styles/profile.module.css";

export function ProfileAvatarPanel({
  avatarDisplayUrl,
  displayName,
  email,
  initials,
  isEditing,
  onAvatarChange,
}: {
  avatarDisplayUrl: string | null;
  displayName: string;
  email: string;
  initials: string;
  isEditing: boolean;
  onAvatarChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <section
      id="profile-card"
      className={styles.panel}
      aria-labelledby="profile-card-title"
    >
      <div className={styles.panelHeader}>
        <p className={styles.eyebrow}>Public profile</p>
        <h2 id="profile-card-title" className={styles.panelTitle}>
          What people see
        </h2>
        <p className={styles.panelSubtitle}>
          Manage the avatar and display identity shown across FIT surfaces such
          as Community. Private sign-in details stay in personal details.
        </p>
      </div>

      <div className={styles.panelBody}>
        <div className={styles.profileHero}>
          <div className={styles.avatarCluster}>
            <div className={styles.avatarFrame}>
              {avatarDisplayUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className={styles.avatarImage}
                  src={avatarDisplayUrl}
                  alt="Profile avatar"
                />
              ) : (
                <span className={styles.avatarInitials}>{initials}</span>
              )}
            </div>

            <label
              className={cn(
                styles.avatarButton,
                !isEditing ? styles.avatarButtonDisabled : null,
                FIT_FOCUS_VISIBLE,
              )}
            >
              <CameraAltRoundedIcon sx={{ fontSize: 17 }} aria-hidden="true" />
              Change avatar
              <input
                type="file"
                accept="image/*"
                className={styles.visuallyHidden}
                disabled={!isEditing}
                onChange={onAvatarChange}
              />
            </label>
          </div>

          <div className={styles.identityBlock}>
            <h3 className={styles.identityName}>{displayName}</h3>
            <p className={styles.identityHint}>
              Your display name comes from your saved first and last name.
            </p>
            <div className={styles.detailList}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Display name</span>
                <span className={styles.detailValue}>{displayName}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Sign-in email</span>
                <span className={styles.detailValue}>{email || "Not set"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
