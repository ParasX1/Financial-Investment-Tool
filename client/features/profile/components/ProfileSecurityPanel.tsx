import VpnKeyRoundedIcon from "@mui/icons-material/VpnKeyRounded";
import { FIT_FOCUS_VISIBLE, cn } from "@/components/shared/uiPrimitives";
import { ProfileField } from "./ProfileField";
import styles from "../styles/profile.module.css";

export function ProfileSecurityPanel({
  confirmPassword,
  isEditing,
  newPassword,
  onChangePassword,
  setConfirmPassword,
  setNewPassword,
  updatingPassword,
}: {
  confirmPassword: string;
  isEditing: boolean;
  newPassword: string;
  onChangePassword: (event: React.FormEvent) => void;
  setConfirmPassword: (value: string) => void;
  setNewPassword: (value: string) => void;
  updatingPassword: boolean;
}) {
  return (
    <section
      id="security"
      className={styles.panel}
      aria-labelledby="profile-security-title"
    >
      <div className={styles.panelHeader}>
        <p className={styles.eyebrow}>Sign-in security</p>
        <h2 id="profile-security-title" className={styles.panelTitle}>
          Password
        </h2>
        <p className={styles.panelSubtitle}>
          Password changes are intentionally separate from profile saves. Choose
          a new password for the currently signed-in account.
        </p>
      </div>

      <div className={styles.panelBody}>
        <form className={styles.form} onSubmit={onChangePassword}>
          <div className={styles.formGrid}>
            <ProfileField
              autoComplete="new-password"
              disabled={!isEditing}
              helperText="Use at least 6 characters."
              id="profile-new-password"
              label="New password"
              type="password"
              value={newPassword}
              onChange={setNewPassword}
            />
            <ProfileField
              autoComplete="new-password"
              disabled={!isEditing}
              helperText="Repeat the new password exactly."
              id="profile-confirm-password"
              label="Confirm new password"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
            />
          </div>

          <div className={styles.actionRow}>
            <button
              type="submit"
              className={cn(
                styles.button,
                styles.buttonSecondary,
                FIT_FOCUS_VISIBLE,
              )}
              disabled={!isEditing || updatingPassword}
            >
              <VpnKeyRoundedIcon sx={{ fontSize: 17 }} aria-hidden="true" />
              {updatingPassword ? "Updating password..." : "Update password"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
